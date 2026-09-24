package com.weiran.system.application.rbac;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.kjs.wuli3.core.time.ClockProvider;
import com.weiran.common.page.PageResult;
import com.weiran.system.api.rbac.BanQuery;
import com.weiran.system.api.rbac.BanService;
import com.weiran.system.api.rbac.BanView;
import com.weiran.system.api.rbac.CreateBanCommand;
import com.weiran.system.api.rbac.UpdateBanCommand;
import com.weiran.system.domain.error.SystemErrors;
import com.weiran.system.domain.port.BanRepository;
import com.weiran.system.domain.rbac.Ban;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

/** 封禁管理用例。删除记录即视为解除该条封禁，见 {@link Ban} 的类注释。 */
@RequiredArgsConstructor
public class BanApplicationService implements BanService {

    private final BanRepository banRepository;

    private final ClockProvider clockProvider;

    @Override
    public PageResult<BanView> list(final BanQuery query) {
        final PageResult<Ban> page = this.banRepository.list(query.page(), query.type(), query.accountType());
        return new PageResult<>(
                page.items().stream().map(BanApplicationService::toView).toList(),
                page.total(),
                page.page(),
                page.size());
    }

    @Override
    @Transactional
    public BanView create(final CreateBanCommand command) {
        final Ban ban = Ban.builder()
                .accountType(command.accountType())
                .type(command.type())
                .value(command.value())
                .ipStart(command.ipStart())
                .ipEnd(command.ipEnd())
                .note(command.note())
                .createdAt(this.now())
                .build();
        return BanApplicationService.toView(this.banRepository.insert(ban));
    }

    @Override
    @Transactional
    public BanView update(final long banId, final UpdateBanCommand command) {
        final Ban ban = this.requireBan(banId);
        final Ban updated = ban.update(command.value(), command.ipStart(), command.ipEnd(), command.note());
        this.banRepository.update(updated);
        return BanApplicationService.toView(updated);
    }

    @Override
    @Transactional
    public void delete(final long banId) {
        this.requireBan(banId);
        this.banRepository.delete(banId);
    }

    private Ban requireBan(final long banId) {
        return this.banRepository.findById(banId).orElseThrow(() -> new ErrorCodeException(SystemErrors.BAN_NOT_FOUND));
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(this.clockProvider.instant(), this.clockProvider.zone());
    }

    private static BanView toView(final Ban ban) {
        return new BanView(
                ban.getId(),
                ban.getAccountType(),
                ban.getType(),
                ban.getValue(),
                ban.getIpStart(),
                ban.getIpEnd(),
                ban.getNote(),
                ban.getCreatedAt());
    }
}
