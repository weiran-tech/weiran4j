package com.wulicode.weiran.platform.domain.config;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 系统配置仓储端口。 */
public interface ConfigRepository {

    /** 按 ID 查找。 */
    Optional<SystemConfig> findById(long id);

    /** 按键查找。 */
    Optional<SystemConfig> findByKey(String configKey);

    /** 在事务中按键锁定已有配置，供值更新校验。 */
    Optional<SystemConfig> findByKeyForUpdate(String configKey);

    /** 键是否已存在。 */
    boolean existsByKey(String configKey);

    /** 分组是否包含配置项。 */
    boolean existsByGroupKey(String groupKey, String keyPrefix);

    /** 新增或更新，返回 ID。 */
    long save(SystemConfig config);

    /** 只更新已有配置的值并同步媒体引用；未找到对应 ID 与键时返回 false。 */
    boolean updateValue(long id, String configKey, String configValue);

    /** 删除。 */
    void deleteById(long id);

    /** 分页查询，keyword 匹配键与描述，按 ID 升序。 */
    PageResult<SystemConfig> page(@Nullable String keyword, PageQuery pageQuery);

    /** 全量配置，按分组与键排序，供可视化表单生成。 */
    List<SystemConfig> findAll();
}
