package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.domain.port.BanRepository;
import com.weiran.system.domain.rbac.Ban;
import com.weiran.system.infrastructure.persistence.entity.PamBanDO;
import com.weiran.system.infrastructure.persistence.mapper.PamBanMapper;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;

/** 基于 MyBatis-Plus 的封禁仓储实现。 */
@RequiredArgsConstructor
public class MyBatisBanRepository implements BanRepository {

    private final PamBanMapper banMapper;

    @Override
    public PageResult<Ban> list(final PageQuery page, final @Nullable String type, final @Nullable String accountType) {
        final IPage<PamBanDO> result = this.banMapper.selectPage(
                new Page<>(page.page(), page.size()),
                Wrappers.<PamBanDO>lambdaQuery()
                        .eq(type != null, PamBanDO::getType, type)
                        .eq(accountType != null, PamBanDO::getAccountType, accountType));
        return PageResult.of(
                result.getRecords().stream().map(MyBatisBanRepository::toDomain).toList(), result.getTotal(), page);
    }

    @Override
    public Optional<Ban> findById(final long banId) {
        return Optional.ofNullable(this.banMapper.selectById(banId)).map(MyBatisBanRepository::toDomain);
    }

    @Override
    public Ban insert(final Ban ban) {
        final PamBanDO record = MyBatisBanRepository.toDO(ban);
        this.banMapper.insert(record);
        return ban.toBuilder().id(record.getId()).build();
    }

    @Override
    public void update(final Ban ban) {
        this.banMapper.update(
                null,
                Wrappers.<PamBanDO>lambdaUpdate()
                        .eq(PamBanDO::getId, ban.getId())
                        .set(PamBanDO::getValue, ban.getValue())
                        .set(PamBanDO::getIpStart, ban.getIpStart())
                        .set(PamBanDO::getIpEnd, ban.getIpEnd())
                        .set(PamBanDO::getNote, MyBatisBanRepository.orEmpty(ban.getNote())));
    }

    @Override
    public void delete(final long banId) {
        this.banMapper.deleteById(banId);
    }

    private static Ban toDomain(final PamBanDO record) {
        return Ban.builder()
                .id(record.getId())
                .accountType(record.getAccountType())
                .type(record.getType())
                .value(record.getValue())
                .ipStart(record.getIpStart() == null ? 0L : record.getIpStart())
                .ipEnd(record.getIpEnd() == null ? 0L : record.getIpEnd())
                .note(record.getNote())
                .createdAt(record.getCreatedAt())
                .build();
    }

    private static PamBanDO toDO(final Ban ban) {
        final PamBanDO record = new PamBanDO();
        record.setAccountType(ban.getAccountType());
        record.setType(ban.getType());
        record.setValue(ban.getValue());
        record.setIpStart(ban.getIpStart());
        record.setIpEnd(ban.getIpEnd());
        record.setNote(MyBatisBanRepository.orEmpty(ban.getNote()));
        record.setCreatedAt(ban.getCreatedAt());
        return record;
    }

    /** {@code pam_ban.note} 是 {@code NOT NULL DEFAULT ''}（对齐 PHP 迁移文件），null 必须落地前规整为空串。 */
    private static String orEmpty(final @Nullable String value) {
        return value == null ? "" : value;
    }
}
