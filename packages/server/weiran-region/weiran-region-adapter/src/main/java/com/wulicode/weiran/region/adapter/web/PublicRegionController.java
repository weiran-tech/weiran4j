package com.wulicode.weiran.region.adapter.web;

import com.wulicode.weiran.region.api.region.RegionNode;
import com.wulicode.weiran.region.application.region.RegionApplicationService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 供前台注册和资料维护使用的公开地区树。 */
@RestController
@RequestMapping("/api-backend/n/region/area")
public class PublicRegionController {

    private final RegionApplicationService regionService;

    /** 构造公开地区控制器。 */
    public PublicRegionController(final RegionApplicationService regionService) {
        this.regionService = regionService;
    }

    /** 只返回已启用的地区及其启用祖先。 */
    @GetMapping("/getEnabledTree")
    public List<RegionNode> getEnabledTree() {
        return this.regionService.enabledTree();
    }
}
