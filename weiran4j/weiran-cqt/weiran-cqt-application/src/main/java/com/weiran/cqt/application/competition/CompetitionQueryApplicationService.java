package com.weiran.cqt.application.competition;

import com.weiran.cqt.api.competition.CategoryView;
import com.weiran.cqt.api.competition.CompetitionQueryService;
import com.weiran.cqt.api.competition.CompetitionView;
import com.weiran.cqt.api.competition.GroupView;
import com.weiran.cqt.domain.competition.Category;
import com.weiran.cqt.domain.competition.Competition;
import com.weiran.cqt.domain.competition.CompetitionRepository;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** {@link CompetitionQueryService} 实现。 */
public class CompetitionQueryApplicationService implements CompetitionQueryService {

    private final CompetitionRepository competitionRepository;

    /** 构造服务。 */
    public CompetitionQueryApplicationService(final CompetitionRepository competitionRepository) {
        this.competitionRepository = competitionRepository;
    }

    @Override
    public List<CompetitionView> competitions(final @Nullable Integer status, final @Nullable String name) {
        return this.competitionRepository.list(status, name).stream()
                .map(c -> new CompetitionView(
                        c.id(), c.legacyId(), c.name(), c.edition(), c.year(), c.description(), c.status()))
                .toList();
    }

    @Override
    public List<CategoryView> firstCategories(final long competitionId) {
        final boolean open = this.competitionRepository
                .findById(competitionId)
                .map(Competition::isEnabled)
                .orElse(false);
        return open
                ? CompetitionQueryApplicationService.views(this.competitionRepository.findEnabledChildren(0))
                : List.of();
    }

    @Override
    public List<CategoryView> secondCategories(final long parentLegacyId) {
        return CompetitionQueryApplicationService.views(this.competitionRepository.findEnabledChildren(parentLegacyId));
    }

    @Override
    public List<GroupView> groups(
            final long competitionId, final long firstCategoryLegacyId, final long secondCategoryLegacyId) {
        if (competitionId == 0 || firstCategoryLegacyId == 0) {
            return List.of();
        }
        return this.competitionRepository
                .findEnabledGroups(competitionId, firstCategoryLegacyId, secondCategoryLegacyId)
                .stream()
                .map(g -> new GroupView(g.id(), g.name(), g.id()))
                .toList();
    }

    private static List<CategoryView> views(final List<Category> categories) {
        return categories.stream()
                .map(c -> new CategoryView(
                        c.legacyId(),
                        c.parentLegacyId(),
                        c.name(),
                        c.sortOrder(),
                        c.status(),
                        c.attachmentRequired() ? 1 : 0))
                .toList();
    }
}
