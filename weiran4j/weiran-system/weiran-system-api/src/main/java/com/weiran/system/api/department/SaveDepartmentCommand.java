package com.weiran.system.api.department;

import org.jspecify.annotations.Nullable;

/**
 * 新增或修改部门。
 *
 * @param parentId 父 ID，0 为根
 * @param name 名称
 * @param code 编码
 * @param leaderId 负责人用户 ID
 * @param phone 联系电话
 * @param sort 排序，空为 0
 * @param status 状态，空为 enabled
 */
public record SaveDepartmentCommand(
        long parentId,
        String name,
        String code,
        @Nullable Long leaderId,
        @Nullable String phone,
        @Nullable Integer sort,
        @Nullable String status) {}
