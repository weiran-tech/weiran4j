package com.weiran.cqt.adapter.portal;

import com.weiran.cqt.api.region.RegionService;
import com.weiran.cqt.api.region.RegionView;
import java.util.List;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/** 前台「赛事分类」接口组（沿用原系统 {@code /api/competcategory/*} 的分组名）。 */
@PortalController
@RequestMapping("/api-web/competcategory")
public class CompetCategoryController {

    private final RegionService regionService;

    /** 构造 Controller。 */
    public CompetCategoryController(final RegionService regionService) {
        this.regionService = regionService;
    }

    /** 赛区列表（公开）。 */
    @PortalPublic
    @RequestMapping(
            value = "/regions",
            method = {RequestMethod.GET, RequestMethod.POST})
    public PortalResult<List<RegionView>> regions() {
        return PortalResult.ok(this.regionService.list());
    }
}
