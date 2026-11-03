package com.wulicode.weiran.platform.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wulicode.weiran.platform.domain.config.ConfigGroup;
import com.wulicode.weiran.platform.domain.config.ConfigGroupRepository;
import com.wulicode.weiran.platform.infrastructure.persistence.entity.SysGroupDO;
import com.wulicode.weiran.platform.infrastructure.persistence.mapper.SysGroupMapper;
import java.util.List;
import java.util.Optional;

/** {@link ConfigGroupRepository} 的 MyBatis-Plus 实现。 */
public class MybatisConfigGroupRepository implements ConfigGroupRepository {

    private final SysGroupMapper groupMapper;

    /** 构造仓储。 */
    public MybatisConfigGroupRepository(final SysGroupMapper groupMapper) {
        this.groupMapper = groupMapper;
    }

    @Override
    public List<ConfigGroup> findEnabled() {
        return this.groupMapper
                .selectList(Wrappers.lambdaQuery(SysGroupDO.class)
                        .eq(SysGroupDO::getType, "config")
                        .eq(SysGroupDO::getStatus, "enabled")
                        .orderByAsc(SysGroupDO::getSort)
                        .orderByAsc(SysGroupDO::getId))
                .stream()
                .map(MybatisConfigGroupRepository::toDomain)
                .toList();
    }

    @Override
    public Optional<ConfigGroup> findEnabledByKey(final String groupKey, final String key) {
        return Optional.ofNullable(this.groupMapper.selectOne(Wrappers.lambdaQuery(SysGroupDO.class)
                        .eq(SysGroupDO::getType, "config")
                        .eq(SysGroupDO::getGroupKey, groupKey)
                        .eq(SysGroupDO::getCode, key)
                        .eq(SysGroupDO::getStatus, "enabled")))
                .map(MybatisConfigGroupRepository::toDomain);
    }

    @Override
    public boolean existsByKey(final String groupKey, final String key) {
        return this.groupMapper.exists(Wrappers.lambdaQuery(SysGroupDO.class)
                .eq(SysGroupDO::getType, "config")
                .eq(SysGroupDO::getGroupKey, groupKey)
                .eq(SysGroupDO::getCode, key));
    }

    @Override
    public long save(final ConfigGroup group) {
        final SysGroupDO row = new SysGroupDO();
        row.setType("config");
        row.setGroupKey(group.groupKey());
        row.setName(group.label());
        row.setCode(group.key());
        row.setStatus("enabled");
        row.setSort(group.sort());
        row.setIsBuiltin(false);
        this.groupMapper.insert(row);
        return row.getId();
    }

    @Override
    public boolean updateLabel(final String groupKey, final String key, final String label) {
        final SysGroupDO row = this.groupMapper.selectOne(Wrappers.lambdaQuery(SysGroupDO.class)
                .eq(SysGroupDO::getType, "config")
                .eq(SysGroupDO::getGroupKey, groupKey)
                .eq(SysGroupDO::getCode, key)
                .eq(SysGroupDO::getStatus, "enabled"));
        if (row == null) {
            return false;
        }
        row.setName(label);
        return this.groupMapper.updateById(row) > 0;
    }

    @Override
    public boolean deleteByKey(final String groupKey, final String key) {
        return this.groupMapper.delete(Wrappers.lambdaQuery(SysGroupDO.class)
                        .eq(SysGroupDO::getType, "config")
                        .eq(SysGroupDO::getGroupKey, groupKey)
                        .eq(SysGroupDO::getCode, key)
                        .eq(SysGroupDO::getStatus, "enabled"))
                > 0;
    }

    private static ConfigGroup toDomain(final SysGroupDO row) {
        return new ConfigGroup(
                row.getGroupKey(),
                row.getCode(),
                row.getName(),
                row.getSort() == null ? 0 : row.getSort(),
                Boolean.TRUE.equals(row.getIsBuiltin()),
                row.getCreatedAt());
    }
}
