package com.weiran.cqt.domain.competition;

import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 赛事、赛项、组别仓储端口。 */
public interface CompetitionRepository {

    /** 赛事列表，按年份、ID 倒序；{@code status} 精确、{@code name} 包含过滤，为 null 不过滤。 */
    List<Competition> list(@Nullable Integer status, @Nullable String name);

    /** 按 ID 取赛事。 */
    Optional<Competition> findById(long id);

    /** 按编号取赛项（不论启用与否）。 */
    Optional<Category> findCategory(long legacyId);

    /** 某上级（0 为一级）下启用的赛项，按排序、ID 升序。 */
    List<Category> findEnabledChildren(long parentLegacyId);

    /** 某赛事启用的、适用于该赛项（0 为通用）的组别，按 ID 升序。 */
    List<Group> findEnabledGroups(long competitionId, long firstCategoryLegacyId, long secondCategoryLegacyId);
}
