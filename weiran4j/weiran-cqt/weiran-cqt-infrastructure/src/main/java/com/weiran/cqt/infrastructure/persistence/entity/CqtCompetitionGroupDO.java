package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_competition_groups} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_competition_groups")
public class CqtCompetitionGroupDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long competitionId;

    private Long firstCategoryLegacyId;

    private Long secondCategoryLegacyId;

    private String name;

    private Integer status;
}
