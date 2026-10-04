package com.weiran.cqt.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.cqt.domain.region.Region;
import com.weiran.cqt.domain.region.RegionRepository;
import com.weiran.cqt.infrastructure.persistence.entity.CqtRegionDO;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtRegionMapper;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** {@link RegionRepository} 的 MyBatis-Plus 实现。 */
public class MybatisRegionRepository implements RegionRepository {

    private final CqtRegionMapper regionMapper;

    /** 构造仓储。 */
    public MybatisRegionRepository(final CqtRegionMapper regionMapper) {
        this.regionMapper = regionMapper;
    }

    @Override
    public List<Region> findAll() {
        return this.regionMapper
                .selectList(Wrappers.lambdaQuery(CqtRegionDO.class)
                        .orderByAsc(CqtRegionDO::getParentLegacyId)
                        .orderByAsc(CqtRegionDO::getId))
                .stream()
                .map(row -> new Region(
                        Objects.requireNonNullElse(row.getLegacyId(), 0L),
                        Objects.requireNonNullElse(row.getParentLegacyId(), 0L),
                        Objects.requireNonNullElse(row.getName(), ""),
                        row.getCode()))
                .toList();
    }

    @Override
    public Optional<String> findNameByLegacyId(final long legacyId) {
        return Optional.ofNullable(this.regionMapper.selectOne(Wrappers.lambdaQuery(CqtRegionDO.class)
                        .select(CqtRegionDO::getId, CqtRegionDO::getName)
                        .eq(CqtRegionDO::getLegacyId, legacyId)))
                .map(CqtRegionDO::getName);
    }
}
