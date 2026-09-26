package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_role} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_role")
public class SysRoleDO extends AuditableDO {

    private String name;

    private String code;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String description;

    private Integer sort;

    private String status;

    private Boolean isBuiltin;
}
