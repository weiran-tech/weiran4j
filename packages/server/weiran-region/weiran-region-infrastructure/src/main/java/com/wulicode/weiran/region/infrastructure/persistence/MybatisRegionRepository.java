package com.wulicode.weiran.region.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wulicode.weiran.framework.status.EnableStatus;
import com.wulicode.weiran.region.domain.region.Region;
import com.wulicode.weiran.region.domain.region.RegionLevel;
import com.wulicode.weiran.region.domain.region.RegionRepository;
import com.wulicode.weiran.region.infrastructure.persistence.entity.RegionDO;
import com.wulicode.weiran.region.infrastructure.persistence.mapper.RegionMapper;
import java.util.List;
import java.util.Optional;

/** {@link RegionRepository} 的 MyBatis-Plus 实现。 */
public class MybatisRegionRepository implements RegionRepository {

    private final RegionMapper regionMapper;

    /** 构造地区仓储。 */
    public MybatisRegionRepository(final RegionMapper regionMapper) {
        this.regionMapper = regionMapper;
    }

    @Override
    public Optional<Region> findById(final long id) {
        return Optional.ofNullable(this.regionMapper.selectById(id)).map(MybatisRegionRepository::toDomain);
    }

    @Override
    public Optional<Region> findByCode(final String code) {
        return Optional.ofNullable(this.regionMapper.selectOne(
                        Wrappers.lambdaQuery(RegionDO.class).eq(RegionDO::getCode, code)))
                .map(MybatisRegionRepository::toDomain);
    }

    @Override
    public List<Region> findAll() {
        return this.regionMapper
                .selectList(Wrappers.lambdaQuery(RegionDO.class)
                        .orderByAsc(RegionDO::getSort)
                        .orderByAsc(RegionDO::getCode))
                .stream()
                .map(MybatisRegionRepository::toDomain)
                .toList();
    }

    @Override
    public boolean hasChildren(final String parentCode) {
        return this.regionMapper.exists(Wrappers.lambdaQuery(RegionDO.class).eq(RegionDO::getParentCode, parentCode));
    }

    @Override
    public long save(final Region region) {
        final RegionDO row = MybatisRegionRepository.toDataObject(region);
        if (row.getId() == null) {
            this.regionMapper.insert(row);
        } else {
            this.regionMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        this.regionMapper.deleteById(id);
    }

    private static Region toDomain(final RegionDO row) {
        return Region.builder()
                .id(row.getId())
                .code(row.getCode())
                .name(row.getName())
                .level(RegionLevel.of(row.getLevel()))
                .parentCode(row.getParentCode())
                .sort(row.getSort() == null ? 0 : row.getSort())
                .status(EnableStatus.of(row.getStatus()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    private static RegionDO toDataObject(final Region region) {
        final RegionDO row = new RegionDO();
        row.setId(region.getId());
        row.setCode(region.getCode());
        row.setName(region.getName());
        row.setLevel(region.getLevel().value());
        row.setParentCode(region.getParentCode());
        row.setSort(region.getSort());
        row.setStatus(region.getStatus().value());
        return row;
    }
}
