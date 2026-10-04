package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_entries} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_entries")
public class CqtEntryDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String entryNo;

    private Integer sourceChannelId;

    private String sourceDatabase;

    private String sourceTable;

    private Long sourceId;

    private Long competitionId;

    private String stageScope;

    private Long legacyCompetitionId;

    private Long firstCategoryLegacyId;

    private Long secondCategoryLegacyId;

    private Long regionLegacyId;

    private Long legacySchoolId;

    private String title;

    private String description;

    private String attachmentUrl;

    private String attachmentName;

    private String attachmentType;

    private String teacherNames;

    private String majorName;

    private String groupName;

    private String entryType;

    private Integer declaredGroupSize;

    private String scoringScope;

    private String status;

    private Integer legacyStatus;

    private LocalDateTime submittedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
