package com.weiran.framework.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import org.apache.ibatis.reflection.MetaObject;
import org.apache.ibatis.reflection.SystemMetaObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AuditMetaObjectHandlerTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-26T02:00:00Z"), ZoneOffset.ofHours(8));

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 26, 10, 0);

    private static final class SampleDO extends AuditableDO {}

    private final AuditMetaObjectHandler handler =
            new AuditMetaObjectHandler(AuditMetaObjectHandlerTest.CLOCK, new CurrentUserAuditorProvider());

    @Test
    @DisplayName("插入时填充时间与审计人，已有值不覆盖")
    void fillsOnInsert() {
        final SampleDO entity = new SampleDO();
        final LocalDateTime explicit = LocalDateTime.of(2020, 1, 1, 0, 0);
        entity.setCreatedAt(explicit);
        final MetaObject metaObject = SystemMetaObject.forObject(entity);

        CurrentUser.runAs(new LoginUser(7L, "u", "u", Set.of(), Set.of()), () -> this.handler.insertFill(metaObject));

        assertThat(entity.getCreatedAt()).isEqualTo(explicit);
        assertThat(entity.getUpdatedAt()).isEqualTo(AuditMetaObjectHandlerTest.NOW);
        assertThat(entity.getCreatedBy()).isEqualTo(7L);
        assertThat(entity.getUpdatedBy()).isEqualTo(7L);
    }

    @Test
    @DisplayName("更新时总是覆盖 updatedAt，未登录时审计人保持原值")
    void overwritesOnUpdate() {
        final SampleDO entity = new SampleDO();
        entity.setUpdatedAt(LocalDateTime.of(2020, 1, 1, 0, 0));
        entity.setUpdatedBy(3L);

        this.handler.updateFill(SystemMetaObject.forObject(entity));

        assertThat(entity.getUpdatedAt()).isEqualTo(AuditMetaObjectHandlerTest.NOW);
        assertThat(entity.getUpdatedBy()).isEqualTo(3L);
    }
}
