package com.weiran.cqt.domain.competition;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 赛事（一届）。
 *
 * @param id 赛事 ID
 * @param legacyId 旧系统编号
 * @param name 名称
 * @param edition 届次
 * @param year 年份
 * @param description 说明
 * @param status 1 启用、0 停用草稿、2 已结束
 * @param registrationStart 报名开始（空为不限）
 * @param registrationEnd 报名截止（空为不限）
 * @param separateNationalEntry 是否省国赛分别报名（{@code national_entry_mode=SEPARATE}）
 */
public record Competition(
        long id,
        @Nullable Long legacyId,
        String name,
        @Nullable String edition,
        @Nullable Integer year,
        @Nullable String description,
        int status,
        @Nullable LocalDateTime registrationStart,
        @Nullable LocalDateTime registrationEnd,
        boolean separateNationalEntry) {

    /** 启用状态。 */
    public static final int STATUS_ENABLED = 1;

    /** 是否启用。 */
    public boolean isEnabled() {
        return this.status == Competition.STATUS_ENABLED;
    }

    /** 前台报名的作品阶段：省国赛分别报名时为省赛，否则共用。 */
    public EntryStage portalSignupStage() {
        return this.separateNationalEntry ? EntryStage.PROVINCIAL : EntryStage.BOTH;
    }

    /**
     * 校验当前可报名：已启用且在报名时间窗内；否则抛 409 并给出原因。
     *
     * @param now 当前时间（与库中 {@code datetime} 同时区）
     */
    public void requireOpenForSignup(final LocalDateTime now) {
        if (!this.isEnabled()) {
            throw new BizException(CommonErrors.CONFLICT, "所选赛事尚未启用");
        }
        if (this.registrationStart != null && now.isBefore(this.registrationStart)) {
            throw new BizException(CommonErrors.CONFLICT, "赛事报名尚未开始");
        }
        if (this.registrationEnd != null && now.isAfter(this.registrationEnd)) {
            throw new BizException(CommonErrors.CONFLICT, "赛事报名已经结束");
        }
    }
}
