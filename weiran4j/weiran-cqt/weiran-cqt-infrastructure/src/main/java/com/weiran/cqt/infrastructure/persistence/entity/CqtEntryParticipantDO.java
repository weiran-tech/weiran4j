package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_entry_participants} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_entry_participants")
public class CqtEntryParticipantDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long entryId;

    private Long personId;

    private String sourceDatabase;

    private String sourceTable;

    private Long sourceId;

    private Boolean isLeader;

    private String schoolSnapshot;

    private String groupSnapshot;

    private Integer sortOrder;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
