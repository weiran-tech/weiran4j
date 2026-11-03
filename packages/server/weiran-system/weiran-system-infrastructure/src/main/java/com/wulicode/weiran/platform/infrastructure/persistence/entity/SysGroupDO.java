package com.wulicode.weiran.platform.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wulicode.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_group} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_group")
public class SysGroupDO extends AuditableDO {

    private String type;

    private String groupKey;

    private String name;

    private String code;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String description;

    private String status;

    private Integer sort;

    private Boolean isBuiltin;
}
