package com.weiran.common.tree;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TreesTest {

    private record Flat(long id, long parentId, int sort) {}

    private record Node(long id, List<Node> children) {}

    private static List<Node> build(final List<Flat> items) {
        return Trees.build(
                items,
                Flat::id,
                Flat::parentId,
                Comparator.comparingInt(Flat::sort),
                (item, children) -> new Node(item.id(), children));
    }

    @Test
    @DisplayName("按父子关系组装并按排序字段排序同级节点")
    void buildsSortedTree() {
        final List<Node> roots =
                TreesTest.build(List.of(new Flat(3, 1, 2), new Flat(1, 0, 1), new Flat(2, 1, 1), new Flat(4, 0, 0)));

        assertThat(roots).extracting(Node::id).containsExactly(4L, 1L);
        assertThat(roots.get(1).children()).extracting(Node::id).containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("父节点不在集合内的节点当作根，不丢数据")
    void treatsOrphansAsRoots() {
        final List<Node> roots = TreesTest.build(List.of(new Flat(5, 99, 0), new Flat(6, 5, 0)));

        assertThat(roots).extracting(Node::id).containsExactly(5L);
        assertThat(roots.get(0).children()).extracting(Node::id).containsExactly(6L);
    }
}
