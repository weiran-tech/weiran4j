package com.wulicode.weiran.system.api.user;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 修改用户（不含用户名与密码）。
 *
 * @param nickname 昵称
 * @param gender 性别，空为 unknown
 * @param status 状态，空为 enabled
 * @param roleIds 角色 ID（全量覆盖）
 */
public record UpdateUserCommand(
        String nickname, @Nullable String gender, @Nullable String status, List<Long> roleIds) {}
