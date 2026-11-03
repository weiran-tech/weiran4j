package com.wulicode.weiran.platform.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.persistence.Likes;
import com.wulicode.weiran.framework.persistence.MybatisPages;
import com.wulicode.weiran.platform.domain.config.ConfigRepository;
import com.wulicode.weiran.platform.domain.config.ConfigType;
import com.wulicode.weiran.platform.domain.config.SystemConfig;
import com.wulicode.weiran.platform.infrastructure.persistence.entity.SysConfigDO;
import com.wulicode.weiran.platform.infrastructure.persistence.mapper.SysConfigMapper;
import com.wulicode.weiran.system.domain.media.MediaReferenceRepository;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** {@link ConfigRepository} 的 MyBatis-Plus 实现。 */
public class MybatisConfigRepository implements ConfigRepository {

    private final SysConfigMapper configMapper;
    private final MediaReferenceRepository mediaReferences;

    /** 构造仓储。 */
    public MybatisConfigRepository(final SysConfigMapper configMapper, final MediaReferenceRepository mediaReferences) {
        this.configMapper = configMapper;
        this.mediaReferences = mediaReferences;
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
    public Optional<SystemConfig> findByKeyForUpdate(final String configKey) {
        return Optional.ofNullable(this.configMapper.selectOne(Wrappers.lambdaQuery(SysConfigDO.class)
                        .eq(SysConfigDO::getConfigKey, configKey)
                        .last("FOR UPDATE")))
                .map(MybatisConfigRepository::toDomain);
    }

    @Override
    public boolean existsByKey(final String configKey) {
        return this.configMapper.exists(
                Wrappers.lambdaQuery(SysConfigDO.class).eq(SysConfigDO::getConfigKey, configKey));
    }

    @Override
    public boolean existsByGroupKey(final String groupKey, final String keyPrefix) {
        return this.configMapper.exists(Wrappers.lambdaQuery(SysConfigDO.class)
                .eq(SysConfigDO::getGroupKey, groupKey)
                .likeRight(SysConfigDO::getConfigKey, keyPrefix));
    }

    @Override
    public long save(final SystemConfig config) {
        final SysConfigDO row = new SysConfigDO();
        row.setId(config.getId());
        row.setConfigKey(config.getConfigKey());
        row.setConfigValue(config.getConfigValue());
        row.setConfigType(config.getConfigType().value());
        row.setGroupKey(config.getGroupKey());
        row.setFieldType(config.getFieldType());
        row.setFieldOptions(config.getFieldOptions());
        row.setRequired(config.isRequired());
        row.setDescription(config.getDescription());
        row.setIsBuiltin(config.isBuiltin());
        if (row.getId() == null) {
            this.configMapper.insert(row);
        } else {
            this.configMapper.updateById(row);
        }
        this.replaceValueReferences(row.getId(), row.getConfigKey(), row.getConfigValue());
        return row.getId();
    }

    @Override
    public boolean updateValue(final long id, final String configKey, final String configValue) {
        final int changed = this.configMapper.update(
                null,
                Wrappers.<SysConfigDO>lambdaUpdate()
                        .eq(SysConfigDO::getId, id)
                        .eq(SysConfigDO::getConfigKey, configKey)
                        .set(SysConfigDO::getConfigValue, configValue));
        if (changed != 1
                && !this.configMapper.exists(Wrappers.lambdaQuery(SysConfigDO.class)
                        .eq(SysConfigDO::getId, id)
                        .eq(SysConfigDO::getConfigKey, configKey))) {
            return false;
        }
        this.replaceValueReferences(id, configKey, configValue);
        return true;
    }

    @Override
    public void deleteById(final long id) {
        this.configMapper.deleteById(id);
        this.mediaReferences.replace("system_config", String.valueOf(id), "config_value", "", List.of());
    }

    @Override
    public PageResult<SystemConfig> page(final @Nullable String keyword, final PageQuery pageQuery) {
        final LambdaQueryWrapper<SysConfigDO> wrapper = Wrappers.lambdaQuery(SysConfigDO.class)
                .ne(SysConfigDO::getGroupKey, "security")
                .and(
                        keyword != null,
                        w -> w.like(SysConfigDO::getConfigKey, Likes.escape(keyword))
                                .or()
                                .like(SysConfigDO::getDescription, Likes.escape(keyword)))
                .orderByDesc(SysConfigDO::getId);
        return MybatisPages.toResult(
                this.configMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisConfigRepository::toDomain);
    }

    @Override
    public List<SystemConfig> findAll() {
        return this.configMapper
                .selectList(Wrappers.lambdaQuery(SysConfigDO.class)
                        .ne(SysConfigDO::getGroupKey, "security")
                        .orderByAsc(SysConfigDO::getGroupKey)
                        .orderByAsc(SysConfigDO::getId))
                .stream()
                .map(MybatisConfigRepository::toDomain)
                .toList();
    }

    private void replaceValueReferences(final long id, final String configKey, final String configValue) {
        this.mediaReferences.replace(
                "system_config",
                String.valueOf(id),
                "config_value",
                "系统配置：" + configKey,
                this.mediaReferences.findUrlsInText(configValue));
    }

    private static SystemConfig toDomain(final SysConfigDO row) {
        return SystemConfig.builder()
                .id(row.getId())
                .configKey(row.getConfigKey())
                .configValue(row.getConfigValue() == null ? "" : row.getConfigValue())
                .configType(ConfigType.of(row.getConfigType()))
                .groupKey(row.getGroupKey())
                .fieldType(row.getFieldType())
                .fieldOptions(row.getFieldOptions())
                .required(Boolean.TRUE.equals(row.getRequired()))
                .description(row.getDescription())
                .builtin(Boolean.TRUE.equals(row.getIsBuiltin()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }
}
