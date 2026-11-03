package com.wulicode.weiran.region.domain.region;

import java.util.List;
import java.util.Optional;

/** 行政区划仓储端口。 */
public interface RegionRepository {

    /** 按 ID 查找地区。 */
    Optional<Region> findById(long id);

    /** 按区划代码查找地区。 */
    Optional<Region> findByCode(String code);

    /** 全部地区，按业务 sort 与 code 排序。 */
    List<Region> findAll();

    /** 查询是否存在直接子级。 */
    boolean hasChildren(String parentCode);

    /** 新增或更新并返回地区 ID。 */
    long save(Region region);

    /** 删除地区。 */
    void deleteById(long id);
}
