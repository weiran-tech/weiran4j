package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_competition_participation_keys} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_competition_participation_keys")
public class CqtParticipationKeyDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long competitionId;

    private String stageScope;

    private Long categoryLegacyId;

    private String credentialType;

    private String normalizedIdCard;

    private Long entryId;

    private Long entryParticipantId;

    private String sourceDatabase;
}
