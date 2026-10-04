package com.weiran.cqt.application.portal;

import com.weiran.cqt.api.portal.PortalAuthService;
import com.weiran.cqt.domain.account.AccountRepository;
import com.weiran.cqt.domain.portal.PortalTokenClaims;
import com.weiran.cqt.domain.portal.PortalTokenCodec;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.OptionalLong;

/** {@link PortalAuthService} 实现：令牌有效且版本与账号当前 {@code token_version} 一致才算登录（宪法 CP-8）。 */
public class PortalAuthApplicationService implements PortalAuthService {

    private final PortalTokenCodec tokenCodec;

    private final AccountRepository accountRepository;

    /** 构造服务。 */
    public PortalAuthApplicationService(final PortalTokenCodec tokenCodec, final AccountRepository accountRepository) {
        this.tokenCodec = tokenCodec;
        this.accountRepository = accountRepository;
    }

    @Override
    public OptionalLong authenticate(final String token) {
        final Optional<PortalTokenClaims> claims = this.tokenCodec.parse(token);
        if (claims.isEmpty()) {
            return OptionalLong.empty();
        }
        final long accountId = claims.get().accountId();
        final OptionalInt current = this.accountRepository.findTokenVersion(accountId);
        return current.isPresent() && current.getAsInt() == claims.get().version()
                ? OptionalLong.of(accountId)
                : OptionalLong.empty();
    }
}
