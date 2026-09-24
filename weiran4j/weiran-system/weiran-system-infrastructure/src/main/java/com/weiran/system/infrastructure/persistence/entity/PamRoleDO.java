package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code pam_role} 表映射。
 *
 * <p>字段与 PHP 项目 weiran-v1 的迁移 {@code 2018_02_27_144935_create_pam_role_table} 逐列对齐。
 * 本类只在基础设施层内流转，领域层用 {@code RoleAggregate} 聚合。
 */
@NullUnmarked
@Getter
@Setter
@TableName("pam_role")
public class PamRoleDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String title;

    private String description;

    private String type;

    private Integer isEnable;

    private Integer isSystem;
}
