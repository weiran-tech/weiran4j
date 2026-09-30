package com.weiran.platform.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.framework.persistence.Likes;
import com.weiran.framework.persistence.MybatisPages;
import com.weiran.platform.domain.config.ConfigRepository;
import com.weiran.platform.domain.config.ConfigType;
import com.weiran.platform.domain.config.SystemConfig;
import com.weiran.platform.infrastructure.persistence.entity.SysConfigDO;
import com.weiran.platform.infrastructure.persistence.mapper.SysConfigMapper;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** {@link ConfigRepository} 的 MyBatis-Plus 实现。 */
public class MybatisConfigRepository implements ConfigRepository {

    private final SysConfigMapper configMapper;

    /** 构造仓储。 */
    public MybatisConfigRepository(final SysConfigMapper configMapper) {
        this.configMapper = configMapper;
    }

    @Override
    public Optional<SystemConfig> findById(final long id) {
        return Optional.ofNullable(this.configMapper.selectById(id)).map(MybatisConfigRepository::toDomain);
    }

    @Override
    public Optional<SystemConfig> findByKey(final String configKey) {
        return Optional.ofNullable(this.configMapper.selectOne(
                        Wrappers.lambdaQuery(SysConfigDO.class).eq(SysConfigDO::getConfigKey, configKey)))
                .map(MybatisConfigRepository::toDomain);
    }

    @Override
    public boolean existsByKey(final String configKey) {
        return this.configMapper.exists(
                Wrappers.lambdaQuery(SysConfigDO.class).eq(SysConfigDO::getConfigKey, configKey));
    }

    @Override
    public long save(final SystemConfig config) {
        final SysConfigDO row = new SysConfigDO();
        row.setId(config.getId());
        row.setConfigKey(config.getConfigKey());
        row.setConfigValue(config.getConfigValue());
        row.setConfigType(config.getConfigType().value());
        row.setDescription(config.getDescription());
        row.setIsBuiltin(config.isBuiltin());
        if (row.getId() == null) {
            this.configMapper.insert(row);
        } else {
            this.configMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        this.configMapper.deleteById(id);
    }

    @Override
    public PageResult<SystemConfig> page(final @Nullable String keyword, final PageQuery pageQuery) {
        final LambdaQueryWrapper<SysConfigDO> wrapper = Wrappers.lambdaQuery(SysConfigDO.class)
                .and(
                        keyword != null,
                        w -> w.like(SysConfigDO::getConfigKey, Likes.escape(keyword))
                                .or()
                                .like(SysConfigDO::getDescription, Likes.escape(keyword)))
                .orderByAsc(SysConfigDO::getId);
        return MybatisPages.toResult(
                this.configMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisConfigRepository::toDomain);
    }

    private static SystemConfig toDomain(final SysConfigDO row) {
        return SystemConfig.builder()
                .id(row.getId())
                .configKey(row.getConfigKey())
                .configValue(row.getConfigValue() == null ? "" : row.getConfigValue())
                .configType(ConfigType.of(row.getConfigType()))
                .description(row.getDescription())
                .builtin(Boolean.TRUE.equals(row.getIsBuiltin()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }
}
