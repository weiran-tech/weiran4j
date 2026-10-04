package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_evaluation_targets} 表映射（列沿用 FastAPI 2026 最终结构；只映射本仓库读写到的列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_evaluation_targets")
public class CqtEvaluationTargetDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long entryId;

    private String targetType;

    private String status;
}
