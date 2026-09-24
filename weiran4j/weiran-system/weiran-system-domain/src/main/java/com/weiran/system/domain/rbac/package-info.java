/**
 * RBAC 领域模型：角色、权限点与权限判定。
 *
 * <p>沿用 PHP 项目 {@code weiran/core} 的 Rbac 设计：账号多对多角色
 * （{@code pam_role_account}），角色多对多权限（{@code pam_permission_role}），
 * 账号不直接挂权限。判定逻辑见 {@link com.weiran.system.domain.rbac.PermissionChecker}。
 */
@NullMarked
package com.weiran.system.domain.rbac;

import org.jspecify.annotations.NullMarked;
