package com.weiran.cqt.adapter.portal;

import com.weiran.cqt.api.setting.SiteConfigService;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/** 前台「产品」接口组（沿用原系统 {@code /api/product/*} 的分组名）。 */
@PortalController
@RequestMapping("/api-web/product")
public class ProductController {

    private final SiteConfigService siteConfigService;

    /** 构造 Controller。 */
    public ProductController(final SiteConfigService siteConfigService) {
        this.siteConfigService = siteConfigService;
    }

    /** 站点配置（公开）。 */
    @PortalPublic
    @GetMapping("/getconfig")
    public PortalResult<Map<String, @Nullable Object>> getConfig() {
        return PortalResult.ok(this.siteConfigService.getConfig());
    }
}
