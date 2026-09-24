package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code pam_role_account} 表映射（角色-账号中间表）。
 *
 * <p>字段与 PHP 项目 weiran-v1 的迁移
 * {@code 2018_02_27_144936_create_pam_role_account_table} 逐列对齐。
 *
 * <p>该表无主键、无唯一约束（历史行为），本次不做 ALTER，写入逻辑必须在应用层
 * 保证不产生重复行——见 {@code RoleRepository#replacePermissions} 及本模块对应的实现说明。
 */
@NullUnmarked
@Getter
@Setter
@TableName("pam_role_account")
public class PamRoleAccountDO {

    private Long accountId;

    private Long roleId;
}
