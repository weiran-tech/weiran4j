package com.weiran.cqt.infrastructure.persistence.row;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** 我的报名列表行。 */
@NullUnmarked
@Getter
@Setter
public class MyEntryRowDO {

    private Long entryId;

    private Long competitionId;

    private String competitionName;

    private String title;

    private String status;

    private Integer legacyStatus;

    private Long firstCategoryLegacyId;

    private Long secondCategoryLegacyId;

    private Long regionLegacyId;

    private String attachmentUrl;

    private String teacherNames;

    private LocalDateTime createdAt;

    private String sourceDatabase;

    private String entryType;

    private String leaderName;

    private String leaderPhone;
}
