package com.weiran.platform.api.dict;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.List;

/** 字典管理服务。 */
public interface DictService {

    /** 分页查询。 */
    PageResult<DictView> page(DictQuery query, PageQuery pageQuery);

    /** 详情；不存在抛 40400。 */
    DictView get(long id);

    /** 新增，返回 ID。 */
    long create(SaveDictCommand command);

    /** 修改；内置字典编码不可改。 */
    void update(long id, SaveDictCommand command);

    /** 删除并级联删除字典项；内置不可删。 */
    void delete(long id);

    /** 字典的全部字典项（按 sort）。 */
    List<DictItemView> items(long dictId);

    /** 新增字典项，返回 ID。 */
    long createItem(long dictId, SaveDictItemCommand command);

    /** 修改字典项。 */
    void updateItem(long dictId, long itemId, SaveDictItemCommand command);

    /** 删除字典项。 */
    void deleteItem(long dictId, long itemId);

    /** 按字典编码取启用的字典项（字典禁用时为空）。 */
    List<DictItemView> enabledItemsByCode(String code);
}
