package com.weiran.cqt.application.account;

import com.weiran.cqt.api.account.AccountProfileView;
import com.weiran.cqt.api.account.AccountService;
import com.weiran.cqt.api.account.LoginResult;
import com.weiran.cqt.api.account.RegisterCommand;
import com.weiran.cqt.api.account.ResetPasswordCommand;
import com.weiran.cqt.api.account.UpdateProfileCommand;
import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.api.sms.SmsService;
import com.weiran.cqt.domain.account.Account;
import com.weiran.cqt.domain.account.AccountRepository;
import com.weiran.cqt.domain.account.AccountTypes;
import com.weiran.cqt.domain.account.PasswordHasher;
import com.weiran.cqt.domain.account.ProfileChanges;
import com.weiran.cqt.domain.account.Registration;
import com.weiran.cqt.domain.account.RegistrationForm;
import com.weiran.cqt.domain.portal.PortalTokenCodec;
import com.weiran.cqt.domain.region.RegionRepository;
import com.weiran.framework.error.BizException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link AccountService} 实现。
 *
 * <p>需要短信验证码的操作，先做全部格式校验再消耗验证码（格式错误不该让用户白用一次验证码），
 * 然后才进入查重与写库。
 */
public class AccountApplicationService implements AccountService {

    private static final String TOKEN_TYPE = "bearer";

    private final AccountRepository accountRepository;

    private final RegionRepository regionRepository;

    private final PasswordHasher passwordHasher;

    private final PortalTokenCodec tokenCodec;

    private final SmsService smsService;

    private final Clock clock;

    private final String commitmentTemplateUrl;

    private @Nullable String dummyHash;

    /** 构造服务。 */
    public AccountApplicationService(
            final AccountRepository accountRepository,
            final RegionRepository regionRepository,
            final PasswordHasher passwordHasher,
            final PortalTokenCodec tokenCodec,
            final SmsService smsService,
            final Clock clock,
            @Value("${weiran.cqt.commitment-template-url:}") final String commitmentTemplateUrl) {
        this.accountRepository = accountRepository;
        this.regionRepository = regionRepository;
        this.passwordHasher = passwordHasher;
        this.tokenCodec = tokenCodec;
        this.smsService = smsService;
        this.clock = clock;
        this.commitmentTemplateUrl = commitmentTemplateUrl;
    }

    @Override
    @Transactional(readOnly = true)
    public LoginResult login(
            final @Nullable String phone, final @Nullable String password, final @Nullable String code) {
        this.smsService.verify(AccountApplicationService.strip(phone), code);
        return this.passwordLogin(phone, password);
    }

    @Override
    @Transactional(readOnly = true)
    public LoginResult autologin(final @Nullable String phone, final @Nullable String password) {
        return this.passwordLogin(phone, password);
    }

    @Override
    @Transactional
    public void register(final RegisterCommand command) {
        final Registration registration = Account.validate(
                new RegistrationForm(
                        command.type(),
                        command.name(),
                        command.phone(),
                        command.password(),
                        command.passwordConfirmation(),
                        command.sex(),
                        command.idCard(),
                        command.credentialType(),
                        command.cityId(),
                        command.school(),
                        command.schoolId(),
                        command.contact(),
                        command.address(),
                        command.email(),
                        command.license(),
                        command.commitment()),
                this.today());
        this.smsService.verify(registration.phone(), command.code());
        if (this.accountRepository.existsByPhone(registration.phone())) {
            throw new BizException(CqtErrors.PHONE_REGISTERED);
        }
        final String credential = registration.credential();
        if (registration.isPersonal()
                && credential != null
                && this.accountRepository.existsPersonalCredential(registration.credentialType(), credential, null)) {
            throw new BizException(CqtErrors.CREDENTIAL_REGISTERED);
        }
        final long legacyUserId = this.accountRepository.nextLegacyUserId(AccountTypes.SOURCE_ZHONGXI);
        // validate 已确认密码非空且两次一致。
        final String password = String.valueOf(command.password());
        this.accountRepository.insert(registration.toAccount(this.passwordHasher.hash(password), legacyUserId));
    }

    @Override
    @Transactional(readOnly = true)
    public AccountProfileView profile(final long accountId) {
        final Account account = this.requireAccount(accountId);
        final Integer cityId = account.getCityId();
        final String cityName = cityId == null
                ? ""
                : this.regionRepository.findNameByLegacyId(cityId).orElse("");
        return new AccountProfileView(
                account.requireId(),
                account.getName(),
                account.getUserType(),
                account.getUniid(),
                account.getPhone(),
                account.getSchoolId(),
                account.getIdCard(),
                account.getCredentialType().label(),
                cityId,
                cityName,
                account.getSex(),
                account.getSchool(),
                account.getContact(),
                account.getAddress(),
                account.getEmail(),
                account.getAuditStatus(),
                account.getLicense(),
                account.getCommitment(),
                account.getRejectionReason(),
                account.getSourceDatabase());
    }

    @Override
    @Transactional
    public void updateProfile(final long accountId, final UpdateProfileCommand command) {
        final Account current = this.requireAccount(accountId);
        final Account updated = current.applyProfileChanges(
                new ProfileChanges(
                        command.name(),
                        command.phone(),
                        command.schoolId(),
                        command.idCard(),
                        command.credentialType(),
                        command.cityId(),
                        command.sex(),
                        command.school(),
                        command.contact(),
                        command.address(),
                        command.email(),
                        command.license(),
                        command.commitment()),
                this.today());
        final String idCard = updated.getIdCard();
        if (updated.isPersonal()
                && updated.credentialDiffersFrom(current)
                && idCard != null
                && this.accountRepository.existsPersonalCredential(updated.getCredentialType(), idCard, accountId)) {
            throw new BizException(CqtErrors.CREDENTIAL_REGISTERED);
        }
        this.accountRepository.updateProfile(updated);
    }

    @Override
    @Transactional
    public void resetPassword(final ResetPasswordCommand command) {
        final String password =
                Account.requirePassword(command.password(), command.passwordConfirmation(), "两次密码不一致或密码长度不足");
        final String phone = AccountApplicationService.strip(command.phone());
        this.smsService.verify(phone, command.code());
        if (this.accountRepository.resetPasswordByPhone(phone, this.passwordHasher.hash(password)) == 0) {
            throw BizException.notFound("用户信息不存在");
        }
    }

    @Override
    public String commitmentTemplateUrl() {
        return this.commitmentTemplateUrl;
    }

    private LoginResult passwordLogin(final @Nullable String rawPhone, final @Nullable String password) {
        final Optional<Account> found =
                this.accountRepository.findFirstByPhone(AccountApplicationService.strip(rawPhone));
        final String raw = password == null ? "" : password;
        if (found.isEmpty()) {
            // 账号不存在时也算一次 BCrypt，让两种失败的耗时相近（宪法 CP-10）。
            this.passwordHasher.matches(raw, this.dummyHash());
            throw new BizException(CqtErrors.LOGIN_FAILED);
        }
        final Account account = found.get();
        if (!this.passwordHasher.matches(raw, account.getPasswordHash())) {
            throw new BizException(CqtErrors.LOGIN_FAILED);
        }
        final String token = this.tokenCodec.issue(account.requireId(), account.getTokenVersion());
        return new LoginResult(
                token,
                AccountApplicationService.TOKEN_TYPE,
                this.tokenCodec.ttl().toSeconds());
    }

    private Account requireAccount(final long accountId) {
        return this.accountRepository.findById(accountId).orElseThrow(() -> BizException.notFound("当前用户不存在"));
    }

    private LocalDate today() {
        return LocalDate.now(this.clock);
    }

    private synchronized String dummyHash() {
        if (this.dummyHash == null) {
            this.dummyHash = this.passwordHasher.hash("cqt-dummy-password");
        }
        return this.dummyHash;
    }

    private static String strip(final @Nullable String value) {
        return value == null ? "" : value.strip();
    }
}
