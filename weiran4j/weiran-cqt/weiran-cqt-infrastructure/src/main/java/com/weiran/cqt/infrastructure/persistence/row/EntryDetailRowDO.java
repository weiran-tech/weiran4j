package com.weiran.cqt.infrastructure.persistence.row;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** 报名详情行。 */
@NullUnmarked
@Getter
@Setter
public class EntryDetailRowDO {

    private Long entryId;

    private String entryNo;

    private Long competitionId;

    private String competitionName;

    private String stageScope;

    private Long firstCategoryLegacyId;

    private String firstCategoryName;

    private Long secondCategoryLegacyId;

    private String secondCategoryName;

    private Long regionLegacyId;

    private String regionName;

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

    private String status;

    private Integer legacyStatus;

    private LocalDateTime submittedAt;

    private LocalDateTime createdAt;
}
