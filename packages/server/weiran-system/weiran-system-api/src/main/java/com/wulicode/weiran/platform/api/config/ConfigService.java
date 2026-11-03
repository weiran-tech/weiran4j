package com.wulicode.weiran.platform.api.config;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** 系统配置服务。 */
public interface ConfigService {

    /** 分页查询，keyword 匹配键与描述。 */
    PageResult<ConfigView> page(@Nullable String keyword, PageQuery pageQuery);

    /** 全量系统配置，用于可视化表单。 */
    List<ConfigView> all();

    /** 查询启用的系统配置分组。 */
    List<ConfigGroupView> groups();

    /** 新增配置分组，返回分组 ID。 */
    long createGroup(CreateConfigGroupCommand command);

    /** 修改配置分组名称，分组编码保持不变。 */
    void updateGroup(UpdateConfigGroupCommand command);

    /** 删除空的自定义配置分组；内置分组或含配置项的分组不可删。 */
    void deleteGroup(String groupKey, String key);

    /** 详情；不存在抛 100002。 */
    ConfigView get(long id);

    /** 新增，返回 ID。 */
    long create(SaveConfigCommand command);

    /** 在业务命名空间创建配置；业务分组须已登记，键和字段定义在创建后由业务持有。 */
    long createBusiness(String namespace, SaveConfigCommand command);

    /** 修改；内置项键不可改。 */
    void update(long id, SaveConfigCommand command);

    /** 只修改已存在的业务命名空间配置值；不创建配置或更改键及字段定义。 */
    void updateBusinessValue(String namespace, String configKey, @Nullable String configValue);

    /** 删除；内置不可删。 */
    void delete(long id);

    /** 读取公开配置：非 {@code system.general.title} 抛 100102，不存在抛 100002。 */
    PublicConfigView getPublic(String configKey);
}
