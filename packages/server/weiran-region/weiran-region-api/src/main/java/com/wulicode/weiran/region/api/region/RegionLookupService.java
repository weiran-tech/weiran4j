package com.wulicode.weiran.region.api.region;

import java.util.List;

/** 向其他业务开放的启用地区查询契约。 */
public interface RegionLookupService {

    /** 返回仅包含启用节点及启用祖先链的省市县树。 */
    List<RegionNode> enabledTree();
}
