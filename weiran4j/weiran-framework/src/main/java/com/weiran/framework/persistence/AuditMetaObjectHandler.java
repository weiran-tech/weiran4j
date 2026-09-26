package com.weiran.framework.persistence;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import java.time.Clock;
import java.time.LocalDateTime;
import org.apache.ibatis.reflection.MetaObject;
import org.jspecify.annotations.Nullable;

/**
 * 审计字段自动填充：{@code createdAt / updatedAt / createdBy / updatedBy}。
 *
 * <p>只填实体上真实存在的属性，所以没有审计列的表（关联表、日志表）也能共用。
 * 插入时只在字段为空时填充（调用方显式给值优先）；更新时 {@code updatedAt / updatedBy} 总是覆盖——
 * 实体通常是先查后改的，旧的 updatedAt 非空，「为空才填」会让它永远停在第一次写入的时间。
 */
public class AuditMetaObjectHandler implements MetaObjectHandler {

    private static final String CREATED_AT = "createdAt";

    private static final String UPDATED_AT = "updatedAt";

    private static final String CREATED_BY = "createdBy";

    private static final String UPDATED_BY = "updatedBy";

    private final Clock clock;

    private final AuditorProvider auditorProvider;

    /** 构造填充器。 */
    public AuditMetaObjectHandler(final Clock clock, final AuditorProvider auditorProvider) {
        this.clock = clock;
        this.auditorProvider = auditorProvider;
    }

    @Override
    public void insertFill(final MetaObject metaObject) {
        final LocalDateTime now = LocalDateTime.now(this.clock);
        final Long auditor = this.auditorProvider.currentAuditor().orElse(null);
        this.fillIfEmpty(metaObject, AuditMetaObjectHandler.CREATED_AT, now);
        this.fillIfEmpty(metaObject, AuditMetaObjectHandler.UPDATED_AT, now);
        this.fillIfEmpty(metaObject, AuditMetaObjectHandler.CREATED_BY, auditor);
        this.fillIfEmpty(metaObject, AuditMetaObjectHandler.UPDATED_BY, auditor);
    }

    @Override
    public void updateFill(final MetaObject metaObject) {
        this.overwrite(metaObject, AuditMetaObjectHandler.UPDATED_AT, LocalDateTime.now(this.clock));
        this.overwrite(
                metaObject,
                AuditMetaObjectHandler.UPDATED_BY,
                this.auditorProvider.currentAuditor().orElse(null));
    }

    private void fillIfEmpty(final MetaObject metaObject, final String field, final @Nullable Object value) {
        if (value != null && metaObject.hasSetter(field) && metaObject.getValue(field) == null) {
            metaObject.setValue(field, value);
        }
    }

    private void overwrite(final MetaObject metaObject, final String field, final @Nullable Object value) {
        if (value != null && metaObject.hasSetter(field)) {
            metaObject.setValue(field, value);
        }
    }
}
