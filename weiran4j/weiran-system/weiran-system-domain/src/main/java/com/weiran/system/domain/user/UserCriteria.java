package com.weiran.system.domain.user;

import com.weiran.common.status.EnableStatus;
import java.util.Set;
import org.jspecify.annotations.Nullable;

/**
 * 用户分页查询条件。
 *
 * @param keyword 匹配用户名 / 昵称 / 手机号，空表示不过滤
 * @param status 状态，空表示不过滤
 * @param departmentIds 部门 ID 集合（已展开子部门），空表示不过滤
 */
public record UserCriteria(
        @Nullable String keyword,
        @Nullable EnableStatus status,
        @Nullable Set<Long> departmentIds) {}
