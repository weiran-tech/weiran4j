package com.wulicode.weiran.platform.domain.config;

import java.util.List;
import java.util.Optional;

/** 配置分组持久化端口。 */
public interface ConfigGroupRepository {

    /** 查询启用的配置分组。 */
    List<ConfigGroup> findEnabled();

    /** 按编码查询启用的配置分组。 */
    Optional<ConfigGroup> findEnabledByKey(String groupKey, String key);

    /** 判断配置组编码是否已存在（包含停用分组）。 */
    boolean existsByKey(String groupKey, String key);

    /** 保存配置组。 */
    long save(ConfigGroup group);

    /** 修改启用配置组的名称。 */
    boolean updateLabel(String groupKey, String key, String label);

    /** 删除启用配置组。 */
    boolean deleteByKey(String groupKey, String key);
}
