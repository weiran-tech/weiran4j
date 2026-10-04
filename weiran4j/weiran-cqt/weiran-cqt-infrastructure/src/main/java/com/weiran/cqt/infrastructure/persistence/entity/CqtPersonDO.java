package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_people} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_people")
public class CqtPersonDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String sourceDatabase;

    private String sourceTable;

    private Long sourceId;

    private Long legacyUserId;

    private String nameValue;

    private String idCardValue;

    private String normalizedIdCard;

    private String credentialType;

    private String phoneValue;

    private String schoolValue;

    private String identityStatus;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
