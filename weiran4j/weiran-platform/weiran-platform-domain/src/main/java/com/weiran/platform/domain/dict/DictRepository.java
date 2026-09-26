package com.weiran.platform.domain.dict;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.List;
import java.util.Optional;

/** 字典仓储端口（含字典项）。 */
public interface DictRepository {

    /** 按 ID 查找。 */
    Optional<Dict> findById(long id);

    /** 按编码查找。 */
    Optional<Dict> findByCode(String code);

    /** 编码是否已存在。 */
    boolean existsByCode(String code);

    /** 新增或更新，返回 ID。 */
    long save(Dict dict);

    /** 删除字典并级联删除其字典项。 */
    void deleteById(long id);

    /** 分页查询，按 ID 升序。 */
    PageResult<Dict> page(DictCriteria criteria, PageQuery pageQuery);

    /** 字典的全部字典项，按 sort、id 升序。 */
    List<DictItem> findItems(long dictId);

    /** 按 ID 查找字典项。 */
    Optional<DictItem> findItem(long itemId);

    /** 同一字典内 value 是否已存在。 */
    boolean existsItemValue(long dictId, String value);

    /** 新增或更新字典项，返回 ID。 */
    long saveItem(DictItem item);

    /** 删除字典项。 */
    void deleteItem(long itemId);
}
