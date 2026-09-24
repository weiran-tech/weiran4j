/**
 * weiran-system 领域层：账号、角色、权限的领域模型与端口。
 *
 * <p>本层不依赖 Spring、MyBatis 或任何 Web 框架——这条边界是可测试性的来源，
 * 领域规则的单测不需要启动容器。持久化与签发实现放在 infrastructure 层，通过
 * {@link com.weiran.system.domain.port} 下的端口接口反向依赖。
 *
 * <p>对应 PHP 项目 weiran-v1 的 {@code weiran/system}（pam_account / pam_role /
 * pam_permission 三张主表）与 {@code weiran/core} 的 Rbac 子系统。
 */
@NullMarked
package com.weiran.system.domain;

import org.jspecify.annotations.NullMarked;
