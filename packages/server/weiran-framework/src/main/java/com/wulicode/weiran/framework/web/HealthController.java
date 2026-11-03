package com.wulicode.weiran.framework.web;

import com.wulicode.weiran.framework.auth.PublicApi;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 健康检查：{@code GET /api-backend/n/health}，无需登录。 */
@PublicApi
@RestController
@RequestMapping("/api-backend/n/health")
public class HealthController {

    /** 健康状态。 */
    @GetMapping
    public HealthView health() {
        return new HealthView("UP");
    }

    /**
     * 健康状态响应。
     *
     * @param status 固定为 {@code UP}
     */
    public record HealthView(String status) {}
}
