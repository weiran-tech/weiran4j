package com.weiran.system.domain.hierarchy;

import com.weiran.common.error.BizException;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 父子层级的领域规则。
 *
 * <p>输入是「节点 ID → 父节点 ID」的完整映射（{@code 0} 表示根），由应用层从仓储一次性取出。
 * 所有遍历都带 visited 集合：库里即使已经存在脏环，也只会得到有限结果而不是死循环。
 */
public final class Hierarchy {

    /** 根节点的父 ID。 */
    public static final long ROOT = 0L;

    private final Map<Long, Long> parentById;

    private Hierarchy(final Map<Long, Long> parentById) {
        this.parentById = Map.copyOf(parentById);
    }

    /** 由「节点 ID → 父节点 ID」映射构造。 */
    public static Hierarchy of(final Map<Long, Long> parentById) {
        return new Hierarchy(parentById);
    }

    /**
     * 校验把 {@code id} 挂到 {@code newParentId} 下是否合法。
     *
     * @param id 被移动的节点
     * @param newParentId 新父节点，{@link #ROOT} 表示挂到根
     * @param what 节点名称（「菜单」「部门」），用于提示语
     * @throws BizException 父节点不存在（40000）；父节点是自己或自己的后代（40901）
     */
    public void ensureValidParent(final long id, final long newParentId, final String what) {
        if (newParentId == Hierarchy.ROOT) {
            return;
        }
        if (!this.parentById.containsKey(newParentId)) {
            throw BizException.badRequest("parentId: 上级" + what + "不存在");
        }
        if (newParentId == id || this.descendantsOf(id).contains(newParentId)) {
            throw BizException.conflict("上级" + what + "不能是自己或自己的下级");
        }
    }

    /** 某节点的全部后代（不含自身）。 */
    public Set<Long> descendantsOf(final long id) {
        final Map<Long, List<Long>> children = this.parentById.entrySet().stream()
                .collect(Collectors.groupingBy(
                        Map.Entry::getValue, Collectors.mapping(Map.Entry::getKey, Collectors.toList())));
        final Set<Long> result = new LinkedHashSet<>();
        final Deque<Long> queue = new ArrayDeque<>(children.getOrDefault(id, List.of()));
        while (!queue.isEmpty()) {
            final Long current = queue.poll();
            if (current != id && result.add(current)) {
                queue.addAll(children.getOrDefault(current, List.of()));
            }
        }
        return result;
    }

    /** 某节点自身及全部后代。 */
    public Set<Long> selfAndDescendantsOf(final long id) {
        final Set<Long> result = new LinkedHashSet<>();
        result.add(id);
        result.addAll(this.descendantsOf(id));
        return result;
    }

    /** 给定节点及它们的全部祖先（只包含映射里存在的节点）。 */
    public Set<Long> withAncestors(final Collection<Long> ids) {
        final Set<Long> result = new HashSet<>();
        for (final Long id : ids) {
            Long current = id;
            while (current != null && current != Hierarchy.ROOT && this.parentById.containsKey(current)) {
                if (!result.add(current)) {
                    break;
                }
                current = this.parentById.get(current);
            }
        }
        return result;
    }

    /** 是否存在直接子节点。 */
    public boolean hasChildren(final long id) {
        return this.parentById.containsValue(id);
    }
}
