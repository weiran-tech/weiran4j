package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_competitions} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_competitions")
public class CqtCompetitionDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long legacyId;

    private String name;

    private String edition;

    private Integer year;

    private String description;

    private String nationalEntryMode;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationEnd;

    private Integer status;
}
