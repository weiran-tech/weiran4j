package com.weiran.cqt.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.cqt.domain.competition.Category;
import com.weiran.cqt.domain.competition.Competition;
import com.weiran.cqt.domain.competition.CompetitionRepository;
import com.weiran.cqt.domain.competition.Group;
import com.weiran.cqt.infrastructure.persistence.entity.CqtCompetitionCategoryDO;
import com.weiran.cqt.infrastructure.persistence.entity.CqtCompetitionDO;
import com.weiran.cqt.infrastructure.persistence.entity.CqtCompetitionGroupDO;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtCompetitionCategoryMapper;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtCompetitionGroupMapper;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtCompetitionMapper;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** {@link CompetitionRepository} 的 MyBatis-Plus 实现。 */
public class MybatisCompetitionRepository implements CompetitionRepository {

    private final CqtCompetitionMapper competitionMapper;

    private final CqtCompetitionCategoryMapper categoryMapper;

    private final CqtCompetitionGroupMapper groupMapper;

    /** 构造仓储。 */
    public MybatisCompetitionRepository(
            final CqtCompetitionMapper competitionMapper,
            final CqtCompetitionCategoryMapper categoryMapper,
            final CqtCompetitionGroupMapper groupMapper) {
        this.competitionMapper = competitionMapper;
        this.categoryMapper = categoryMapper;
        this.groupMapper = groupMapper;
    }

    @Override
    public List<Competition> list(final @Nullable Integer status, final @Nullable String name) {
        return this.competitionMapper
                .selectList(Wrappers.lambdaQuery(CqtCompetitionDO.class)
                        .eq(status != null, CqtCompetitionDO::getStatus, status)
                        .like(name != null && !name.isBlank(), CqtCompetitionDO::getName, name)
                        .orderByDesc(CqtCompetitionDO::getYear)
                        .orderByDesc(CqtCompetitionDO::getId))
                .stream()
                .map(MybatisCompetitionRepository::toDomain)
                .toList();
    }

    @Override
    public Optional<Competition> findById(final long id) {
        return Optional.ofNullable(this.competitionMapper.selectById(id)).map(MybatisCompetitionRepository::toDomain);
    }

    @Override
    public Optional<Category> findCategory(final long legacyId) {
        return Optional.ofNullable(this.categoryMapper.selectOne(Wrappers.lambdaQuery(CqtCompetitionCategoryDO.class)
                        .eq(CqtCompetitionCategoryDO::getLegacyId, legacyId)))
                .map(MybatisCompetitionRepository::toDomain);
    }

    @Override
    public List<Category> findEnabledChildren(final long parentLegacyId) {
        return this.categoryMapper
                .selectList(Wrappers.lambdaQuery(CqtCompetitionCategoryDO.class)
                        .eq(CqtCompetitionCategoryDO::getParentLegacyId, parentLegacyId)
                        .eq(CqtCompetitionCategoryDO::getStatus, 1)
                        .orderByAsc(CqtCompetitionCategoryDO::getSortOrder)
                        .orderByAsc(CqtCompetitionCategoryDO::getId))
                .stream()
                .map(MybatisCompetitionRepository::toDomain)
                .toList();
    }

    @Override
    public List<Group> findEnabledGroups(
            final long competitionId, final long firstCategoryLegacyId, final long secondCategoryLegacyId) {
        return this.groupMapper
                .selectList(Wrappers.lambdaQuery(CqtCompetitionGroupDO.class)
                        .eq(CqtCompetitionGroupDO::getCompetitionId, competitionId)
                        .eq(CqtCompetitionGroupDO::getStatus, 1)
                        .in(CqtCompetitionGroupDO::getFirstCategoryLegacyId, 0L, firstCategoryLegacyId)
                        .in(CqtCompetitionGroupDO::getSecondCategoryLegacyId, 0L, secondCategoryLegacyId)
                        .orderByAsc(CqtCompetitionGroupDO::getId))
                .stream()
                .map(row -> new Group(row.getId(), Objects.requireNonNullElse(row.getName(), "")))
                .toList();
    }

    private static Competition toDomain(final CqtCompetitionDO row) {
        return new Competition(
                row.getId(),
                row.getLegacyId(),
                Objects.requireNonNullElse(row.getName(), ""),
                row.getEdition(),
                row.getYear(),
                row.getDescription(),
                Objects.requireNonNullElse(row.getStatus(), 0),
                row.getRegistrationStart(),
                row.getRegistrationEnd(),
                "SEPARATE".equals(row.getNationalEntryMode()));
    }

    private static Category toDomain(final CqtCompetitionCategoryDO row) {
        return new Category(
                Objects.requireNonNullElse(row.getLegacyId(), 0L),
                Objects.requireNonNullElse(row.getParentLegacyId(), 0L),
                Objects.requireNonNullElse(row.getName(), ""),
                Objects.requireNonNullElse(row.getSortOrder(), 0),
                Objects.requireNonNullElse(row.getStatus(), 0),
                Objects.requireNonNullElse(row.getAttachmentRequired(), 0) != 0);
    }
}
