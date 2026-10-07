package com.weiran.system.application.auth;

import com.weiran.framework.auth.AuthCookies;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import com.weiran.framework.error.BizException;
import com.weiran.framework.error.CommonErrors;
import com.weiran.framework.error.ErrorCode;
import com.weiran.framework.log.OperationLogEvent;
import com.weiran.framework.log.OperationLogRecorder;
import com.weiran.framework.text.Texts;
import com.weiran.system.api.auth.BindIdentityCommand;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.ExternalLoginService;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.api.auth.ProviderView;
import com.weiran.system.api.auth.ProvidersView;
import com.weiran.system.api.auth.SsoRedirect;
import com.weiran.system.api.auth.UserIdentityView;
import com.weiran.system.domain.identity.ExternalIdentity;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.ExternalIdentityProviders;
import com.weiran.system.domain.identity.ProvisionedUsername;
import com.weiran.system.domain.identity.RedirectPaths;
import com.weiran.system.domain.identity.SsoMode;
import com.weiran.system.domain.identity.SsoState;
import com.weiran.system.domain.identity.SsoStateSigner;
import com.weiran.system.domain.identity.UserIdentity;
import com.weiran.system.domain.identity.UserIdentityRepository;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

/**
 * 外部身份登录与绑定的编排（D-015）。
 *
 * <p>协议细节在 {@link ExternalIdentityProvider} 实现里；这里只做：流程状态的生成与核对、外部身份到本地用户的映射
 * （只认 {@code (provider, external_id)}，不按用户名关联）、自动开通、绑定规则、登录日志。
 * 回调是浏览器整页导航，所以失败不抛异常，而是跳到带 {@code ssoError} 的页面。
 */
@Slf4j
public class ExternalLoginApplicationService implements ExternalLoginService {

    private static final int RANDOM_BYTES = 32;

    private static final String LOGIN_PAGE = "/login";

    private static final String PROFILE_PAGE = "/profile";

    private final SecureRandom random = new SecureRandom();

    private final ExternalIdentityProviders providers;

    private final SsoStateSigner stateSigner;

    private final UserIdentityRepository identityRepository;

    private final UserRepository userRepository;

    private final IdentityProvisioner provisioner;

    private final AuthApplicationService authService;

    private final ObjectProvider<OperationLogRecorder> operationLogRecorders;

    private final Clock clock;

    /** 构造服务。 */
    public ExternalLoginApplicationService(
            final ExternalIdentityProviders providers,
            final SsoStateSigner stateSigner,
            final UserIdentityRepository identityRepository,
            final UserRepository userRepository,
            final IdentityProvisioner provisioner,
            final AuthApplicationService authService,
            final ObjectProvider<OperationLogRecorder> operationLogRecorders,
            final Clock clock) {
        this.providers = providers;
        this.stateSigner = stateSigner;
        this.identityRepository = identityRepository;
        this.userRepository = userRepository;
        this.provisioner = provisioner;
        this.authService = authService;
        this.operationLogRecorders = operationLogRecorders;
        this.clock = clock;
    }

    @Override
    public ProvidersView providers() {
        return new ProvidersView(
                this.providers.passwordLoginEnabled(),
                this.providers.all().stream()
                        .map(p -> new ProviderView(p.id(), p.type(), p.name()))
                        .toList());
    }

    @Override
    public SsoRedirect authorize(
            final String providerId,
            final @Nullable String redirect,
            final String mode,
            final @Nullable Long currentUserId) {
        final SsoMode ssoMode = SsoMode.parse(mode);
        final Optional<ExternalIdentityProvider> provider = this.providers.find(providerId);
        if (provider.isEmpty()) {
            return ExternalLoginApplicationService.failure(ssoMode, CommonErrors.EXTERNAL_AUTH_FAILED);
        }
        if (ssoMode == SsoMode.BIND && currentUserId == null) {
            return ExternalLoginApplicationService.failure(SsoMode.LOGIN, CommonErrors.UNAUTHORIZED);
        }
        final SsoState state = new SsoState(
                providerId,
                this.randomToken(),
                this.randomToken(),
                this.randomToken(),
                RedirectPaths.normalize(redirect),
                ssoMode,
                ssoMode == SsoMode.BIND ? currentUserId : null,
                this.clock.instant().plus(AuthCookies.SSO_TTL));
        return new SsoRedirect(
                provider.get().authorizeUrl(state, this.callbackUrl(providerId)), this.stateSigner.sign(state), null);
    }

    @Override
    public SsoRedirect callback(
            final String providerId,
            final Map<String, String> params,
            final @Nullable String flowCookie,
            final ClientContext client) {
        final Optional<SsoState> verified =
                flowCookie == null ? Optional.empty() : this.stateSigner.verify(flowCookie, this.clock.instant());
        final SsoMode mode = verified.map(SsoState::mode).orElse(SsoMode.LOGIN);
        try {
            final SsoState state = verified.filter(s -> s.provider().equals(providerId))
                    .filter(s -> s.state().equals(params.get("state")))
                    .orElseThrow(() -> new BizException(CommonErrors.EXTERNAL_AUTH_FAILED, "流程状态无效或已过期"));
            final ExternalIdentityProvider provider = this.providers
                    .find(providerId)
                    .orElseThrow(() -> new BizException(CommonErrors.EXTERNAL_AUTH_FAILED, "提供方未配置"));
            final ExternalIdentity identity = provider.complete(params, state, this.callbackUrl(providerId))
                    .orElseThrow(() -> new BizException(CommonErrors.EXTERNAL_AUTH_FAILED, "外部身份校验失败"));
            if (state.mode() == SsoMode.BIND) {
                final Long bindUserId = state.bindUserId();
                if (bindUserId == null) {
                    throw new BizException(CommonErrors.EXTERNAL_AUTH_FAILED, "绑定流程缺少当前用户");
                }
                this.bindTo(bindUserId, identity, bindUserId, client);
                return new SsoRedirect(
                        PROFILE_PAGE + "?bound=" + ExternalLoginApplicationService.encode(providerId), null, null);
            }
            final LoginResult login = this.login(provider, identity, client);
            return new SsoRedirect(state.redirect(), null, login);
        } catch (final BizException ex) {
            final ErrorCode code = ex.getErrorCode();
            ExternalLoginApplicationService.log.warn(
                    "外部登录失败: provider={} mode={} code={} - {}", providerId, mode, code.code(), ex.getMessage());
            if (mode == SsoMode.LOGIN) {
                this.authService.recordExternalFailure(
                        null, "-", client, Texts.truncate("外部登录失败（" + providerId + "）：" + ex.getMessage(), 256));
            }
            return ExternalLoginApplicationService.failure(mode, code);
        }
    }

    /** 外部身份 → 本地用户：只认绑定；未绑定时按提供方开关开通，绝不按用户名关联已有账号。 */
    private LoginResult login(
            final ExternalIdentityProvider provider, final ExternalIdentity identity, final ClientContext client) {
        final Optional<UserIdentity> binding =
                this.identityRepository.findByProviderAndExternalId(provider.id(), identity.externalId());
        final User user;
        if (binding.isPresent()) {
            user = this.userRepository
                    .findById(binding.get().userId())
                    .orElseThrow(() -> new BizException(CommonErrors.ACCOUNT_NOT_PROVISIONED));
        } else {
            user = this.provision(provider, identity);
        }
        if (!user.isEnabled()) {
            this.authService.recordExternalFailure(user.getId(), user.getUsername(), client, "账号已禁用");
            throw new BizException(CommonErrors.ACCOUNT_DISABLED);
        }
        final String message = provider.type().toUpperCase(Locale.ROOT) + " 登录成功（" + provider.id() + "）";
        return this.authService.completeLogin(user, client, provider.id(), message);
    }

    private User provision(final ExternalIdentityProvider provider, final ExternalIdentity identity) {
        if (!provider.autoProvision()) {
            throw new BizException(CommonErrors.ACCOUNT_NOT_PROVISIONED);
        }
        final String username = ProvisionedUsername.of(provider.id(), identity.externalId(), identity.username());
        if (this.userRepository.existsByUsername(username)) {
            // 本地已有同名用户却没绑定这个外部身份：不自动关联，防冒名接管（D-015），由管理员手工绑定。
            throw new BizException(CommonErrors.ACCOUNT_NOT_PROVISIONED);
        }
        long userId;
        try {
            userId = this.provisioner.provision(provider, identity, username);
        } catch (final DuplicateKeyException ex) {
            // 同一外部身份并发首次登录：另一个请求已经开通，按已绑定处理。
            userId = this.identityRepository
                    .findByProviderAndExternalId(provider.id(), identity.externalId())
                    .map(UserIdentity::userId)
                    .orElseThrow(() -> new BizException(CommonErrors.ACCOUNT_NOT_PROVISIONED));
        }
        final long id = userId;
        return this.userRepository
                .findById(id)
                .orElseThrow(() -> new BizException(CommonErrors.ACCOUNT_NOT_PROVISIONED));
    }

    private void bindTo(
            final long userId, final ExternalIdentity identity, final long operatorId, final ClientContext client) {
        final Optional<UserIdentity> existing =
                this.identityRepository.findByProviderAndExternalId(identity.provider(), identity.externalId());
        if (existing.isPresent()) {
            if (existing.get().userId() == userId) {
                return;
            }
            throw new BizException(CommonErrors.CONFLICT, "该外部账号已绑定其他用户");
        }
        final User user =
                this.userRepository.findById(userId).orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
        this.identityRepository.insert(new UserIdentity(
                null,
                userId,
                identity.provider(),
                identity.externalId(),
                Texts.trimToNull(identity.displayName()),
                LocalDateTime.now(this.clock),
                operatorId));
        this.recordBindOperation(user, identity.provider(), client);
    }

    /** 自助绑定发生在 GET 回调里，不经过 @OperationLog 切面，这里补一条操作日志。 */
    private void recordBindOperation(final User user, final String providerId, final ClientContext client) {
        final OperationLogRecorder recorder = this.operationLogRecorders.getIfAvailable();
        if (recorder == null) {
            return;
        }
        recorder.record(new OperationLogEvent(
                user.getId(),
                user.getUsername(),
                "个人中心",
                "绑定外部账号（" + providerId + "）",
                "GET",
                "/api/auth/sso/" + providerId + "/callback",
                null,
                0,
                true,
                null,
                0,
                client.ip(),
                client.userAgent(),
                LocalDateTime.now(this.clock)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserIdentityView> identitiesOf(final long userId) {
        return this.identityRepository.findByUserId(userId).stream()
                .map(this::toView)
                .toList();
    }

    @Override
    @Transactional
    public void unbindOwn(final long userId, final long identityId) {
        this.requireOwned(userId, identityId);
        final User user =
                this.userRepository.findById(userId).orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
        if (!user.hasPassword() && this.identityRepository.findByUserId(userId).size() <= 1) {
            throw new BizException(CommonErrors.CONFLICT, "这是你唯一的登录方式，解绑后将无法登录；请先请管理员重置密码");
        }
        this.identityRepository.deleteById(identityId);
    }

    @Override
    @Transactional
    public long bind(final long userId, final BindIdentityCommand command) {
        if (this.userRepository.findById(userId).isEmpty()) {
            throw new BizException(CommonErrors.NOT_FOUND, "用户不存在");
        }
        final String providerId = command.provider().strip();
        if (this.providers.find(providerId).isEmpty()) {
            throw BizException.badRequest("provider: 未配置的提供方");
        }
        final String externalId = command.externalId().strip();
        if (externalId.isEmpty()) {
            throw BizException.badRequest("externalId: 不能为空");
        }
        final Optional<UserIdentity> existing =
                this.identityRepository.findByProviderAndExternalId(providerId, externalId);
        if (existing.isPresent()) {
            throw new BizException(
                    CommonErrors.CONFLICT, existing.get().userId() == userId ? "该外部账号已绑定该用户" : "该外部账号已绑定其他用户");
        }
        return this.identityRepository.insert(new UserIdentity(
                null,
                userId,
                providerId,
                externalId,
                Texts.trimToNull(command.displayName()),
                LocalDateTime.now(this.clock),
                CurrentUser.get().map(LoginUser::id).orElse(null)));
    }

    @Override
    @Transactional
    public void unbind(final long userId, final long identityId) {
        this.requireOwned(userId, identityId);
        this.identityRepository.deleteById(identityId);
    }

    private void requireOwned(final long userId, final long identityId) {
        final boolean owned = this.identityRepository
                .findById(identityId)
                .filter(identity -> identity.userId() == userId)
                .isPresent();
        if (!owned) {
            throw new BizException(CommonErrors.NOT_FOUND, "外部身份不存在");
        }
    }

    private UserIdentityView toView(final UserIdentity identity) {
        final String providerName = this.providers
                .find(identity.provider())
                .map(ExternalIdentityProvider::name)
                .orElse(identity.provider());
        return new UserIdentityView(
                identity.requireId(),
                identity.provider(),
                providerName,
                identity.externalId(),
                identity.displayName(),
                identity.createdAt());
    }

    private String callbackUrl(final String providerId) {
        return this.providers.publicBaseUrl() + "/api/auth/sso/" + ExternalLoginApplicationService.encode(providerId)
                + "/callback";
    }

    private String randomToken() {
        final byte[] bytes = new byte[RANDOM_BYTES];
        this.random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static SsoRedirect failure(final SsoMode mode, final ErrorCode code) {
        final String page = mode == SsoMode.BIND ? PROFILE_PAGE : LOGIN_PAGE;
        return new SsoRedirect(page + "?ssoError=" + code.code(), null, null);
    }

    private static String encode(final String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
