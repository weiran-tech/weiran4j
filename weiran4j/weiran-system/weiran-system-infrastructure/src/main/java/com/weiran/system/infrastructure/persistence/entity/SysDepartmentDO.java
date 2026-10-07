package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_department} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_department")
public class SysDepartmentDO extends AuditableDO {

    private Long parentId;

    private String name;

    private String code;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long leaderId;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;

    private Integer sort;

    private String status;
}
