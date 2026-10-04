package com.weiran.cqt.domain.region;

import java.util.List;
import java.util.Optional;

/** 赛区仓储端口。 */
public interface RegionRepository {

    /** 全部赛区，按上级编号、ID 升序。 */
    List<Region> findAll();

    /** 按赛区编号取名称。 */
    Optional<String> findNameByLegacyId(long legacyId);
}
