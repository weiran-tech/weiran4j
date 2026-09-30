package com.weiran.system.api.department;

import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 部门树节点。
 *
 * @param id ID
 * @param parentId 父 ID，0 为根
 * @param name 名称
 * @param code 编码
 * @param leaderId 负责人用户 ID
 * @param leaderName 负责人昵称
 * @param phone 联系电话
 * @param sort 排序
 * @param status 状态
 * @param createdAt 创建时间
 * @param children 子部门
 */
public record DepartmentNode(
        long id,
        long parentId,
        String name,
        String code,
        @Nullable Long leaderId,
        @Nullable String leaderName,
        @Nullable String phone,
        int sort,
        String status,
        @Nullable LocalDateTime createdAt,
        List<DepartmentNode> children) {}
