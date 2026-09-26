package com.weiran.common.tree;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.ToLongFunction;

/**
 * 把扁平的父子列表组装成树。
 *
 * <p>约定 {@code parentId = 0} 表示根；父节点不在集合内的节点（例如被过滤掉的父级）也当作根，
 * 保证数据不完整时不会静默丢节点。
 */
public final class Trees {

    /** 根节点的 parentId。 */
    public static final long ROOT_ID = 0L;

    private Trees() {}

    /**
     * 组装树。
     *
     * @param items 扁平节点
     * @param idOf 取节点 ID
     * @param parentIdOf 取父节点 ID
     * @param order 同级排序
     * @param factory 由「节点 + 已组装好的子节点」构造树节点
     * @param <T> 扁平节点类型
     * @param <N> 树节点类型
     * @return 根节点列表
     */
    public static <T, N> List<N> build(
            final Collection<T> items,
            final ToLongFunction<T> idOf,
            final ToLongFunction<T> parentIdOf,
            final Comparator<? super T> order,
            final BiFunction<T, List<N>, N> factory) {
        final Set<Long> ids = new HashSet<>();
        final Map<Long, List<T>> childrenByParent = new LinkedHashMap<>();
        final List<T> sorted = new ArrayList<>(items);
        sorted.sort(order);
        for (final T item : sorted) {
            ids.add(idOf.applyAsLong(item));
            childrenByParent
                    .computeIfAbsent(parentIdOf.applyAsLong(item), key -> new ArrayList<>())
                    .add(item);
        }
        final List<N> roots = new ArrayList<>();
        final Set<Long> visited = new HashSet<>();
        for (final T item : sorted) {
            final long parentId = parentIdOf.applyAsLong(item);
            if (parentId == Trees.ROOT_ID || !ids.contains(parentId)) {
                roots.add(Trees.assemble(item, idOf, childrenByParent, factory, visited));
            }
        }
        return roots;
    }

    private static <T, N> N assemble(
            final T item,
            final ToLongFunction<T> idOf,
            final Map<Long, List<T>> childrenByParent,
            final BiFunction<T, List<N>, N> factory,
            final Set<Long> visited) {
        final long id = idOf.applyAsLong(item);
        final List<N> children = new ArrayList<>();
        // visited 防御库里已存在的环（应用层保证不会写入，但脏数据不应让接口栈溢出）。
        if (visited.add(id)) {
            for (final T child : childrenByParent.getOrDefault(id, List.of())) {
                children.add(Trees.assemble(child, idOf, childrenByParent, factory, visited));
            }
        }
        return factory.apply(item, List.copyOf(children));
    }
}
