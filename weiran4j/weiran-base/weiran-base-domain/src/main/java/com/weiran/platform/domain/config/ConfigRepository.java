package com.weiran.platform.domain.config;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 系统配置仓储端口。 */
public interface ConfigRepository {

    /** 按 ID 查找。 */
    Optional<SystemConfig> findById(long id);

    /** 按键查找。 */
    Optional<SystemConfig> findByKey(String configKey);

    /** 键是否已存在。 */
    boolean existsByKey(String configKey);

    /** 新增或更新，返回 ID。 */
    long save(SystemConfig config);

    /** 删除。 */
    void deleteById(long id);

    /** 分页查询，keyword 匹配键与描述，按 ID 升序。 */
    PageResult<SystemConfig> page(@Nullable String keyword, PageQuery pageQuery);
}
