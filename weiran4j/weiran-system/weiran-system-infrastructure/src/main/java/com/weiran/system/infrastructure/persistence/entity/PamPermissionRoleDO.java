package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code pam_permission_role} 表映射（权限-角色中间表）。
 *
 * <p>字段与 PHP 项目 weiran-v1 的迁移
 * {@code 2018_02_27_144935_create_pam_permission_role_table} 逐列对齐。
 *
 * <p>该表有联合主键 {@code (permission_id, role_id)}——角色权限的"整体替换"写入
 * 天然依赖这条约束防止重复行，实现层不需要额外的应用层去重。
 */
@NullUnmarked
@Getter
@Setter
@TableName("pam_permission_role")
public class PamPermissionRoleDO {

    private Long permissionId;

    private Long roleId;
}
