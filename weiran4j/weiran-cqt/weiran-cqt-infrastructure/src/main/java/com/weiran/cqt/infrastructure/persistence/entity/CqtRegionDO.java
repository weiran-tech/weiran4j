package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code cqt_regions} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_regions")
public class CqtRegionDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long legacyId;

    private Long parentLegacyId;

    private String name;

    private String code;
}
