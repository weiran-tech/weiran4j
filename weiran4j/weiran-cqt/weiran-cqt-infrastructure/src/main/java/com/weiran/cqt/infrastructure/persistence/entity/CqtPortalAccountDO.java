package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_portal_accounts} 表映射（列沿用原库，无框架审计字段）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_portal_accounts")
public class CqtPortalAccountDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String sourceDatabase;

    private Long legacyUserId;

    private String nameValue;

    private String passwordHash;

    private Integer userType;

    private String legacyUniid;

    private String phoneValue;

    private String legacySchoolId;

    private String idCardValue;

    private String credentialType;

    private Integer cityLegacyId;

    private Integer sex;

    private String schoolValue;

    private String contactValue;

    private String addressValue;

    private String email;

    private Integer auditStatus;

    private String licenseFile;

    private String commitmentFile;

    private String rejectionReason;

    private Integer tokenVersion;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
