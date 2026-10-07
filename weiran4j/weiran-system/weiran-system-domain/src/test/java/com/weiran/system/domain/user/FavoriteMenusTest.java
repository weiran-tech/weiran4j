package com.weiran.system.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.framework.error.BizException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FavoriteMenusTest {

    private static final Set<Long> ACCESSIBLE =
            LongStream.rangeClosed(1, 100).boxed().collect(Collectors.toSet());

    @Test
    @DisplayName("去重时保留首次出现的位置，顺序即收藏顺序")
    void deduplicatesKeepingOrder() {
        assertThat(FavoriteMenus.normalize(List.of(5L, 3L, 5L, 1L, 3L), FavoriteMenusTest.ACCESSIBLE))
                .containsExactly(5L, 3L, 1L);
        assertThat(FavoriteMenus.normalize(List.of(), FavoriteMenusTest.ACCESSIBLE))
                .isEmpty();
    }

    @Test
    @DisplayName("去重后恰好 50 个通过，51 个抛 40000；重复项不计入上限")
    void enforcesMaxSize() {
        final List<Long> fifty = LongStream.rangeClosed(1, 50).boxed().toList();
        final List<Long> fiftyWithDuplicates = new ArrayList<>(fifty);
        fiftyWithDuplicates.addAll(fifty);
        assertThat(FavoriteMenus.normalize(fiftyWithDuplicates, FavoriteMenusTest.ACCESSIBLE))
                .hasSize(FavoriteMenus.MAX_SIZE);

        final List<Long> fiftyOne = LongStream.rangeClosed(1, 51).boxed().toList();
        assertThatThrownBy(() -> FavoriteMenus.normalize(fiftyOne, FavoriteMenusTest.ACCESSIBLE))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("最多收藏 50 个");
    }

    @Test
    @DisplayName("包含不可访问的菜单 ID 抛 40000，并指出是哪一个")
    void rejectsInaccessibleMenu() {
        assertThatThrownBy(() -> FavoriteMenus.normalize(List.of(1L, 999L), FavoriteMenusTest.ACCESSIBLE))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("读取时过滤掉已不可访问的菜单，保持收藏顺序")
    void retainsAccessibleInOrder() {
        assertThat(FavoriteMenus.retainAccessible(List.of(9L, 200L, 2L, 9L, 300L, 1L), FavoriteMenusTest.ACCESSIBLE))
                .containsExactly(9L, 2L, 1L);
    }
}
