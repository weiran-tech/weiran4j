package com.weiran.cqt.api.region;

import java.util.List;

/** 赛区查询。 */
public interface RegionService {

    /** 全部赛区，按上级编号、ID 升序。 */
    List<RegionView> list();
}
