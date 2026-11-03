package com.wulicode.weiran.region.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wulicode.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code region} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("region")
public class RegionDO extends AuditableDO {

    private String code;

    private String name;

    private String level;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String parentCode;

    private Integer sort;

    private String status;
}
