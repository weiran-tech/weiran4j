package com.weiran.cqt.api.competition;

import java.util.List;
import org.jspecify.annotations.Nullable;

/** 前台赛事配置查询。 */
public interface CompetitionQueryService {

    /** 赛事列表，按年份、ID 倒序。 */
    List<CompetitionView> competitions(@Nullable Integer status, @Nullable String name);

    /** 赛事可报的一级赛项；赛事不存在或未启用时为空。 */
    List<CategoryView> firstCategories(long competitionId);

    /** 某一级赛项下启用的二级赛项。 */
    List<CategoryView> secondCategories(long parentLegacyId);

    /** 赛事、赛项适用的启用组别；赛事或一级赛项为 0 时为空。 */
    List<GroupView> groups(long competitionId, long firstCategoryLegacyId, long secondCategoryLegacyId);
}
