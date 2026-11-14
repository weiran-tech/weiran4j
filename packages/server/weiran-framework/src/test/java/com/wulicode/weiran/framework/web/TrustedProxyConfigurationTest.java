package com.wulicode.weiran.framework.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.framework.autoconfigure.WeiranFrameworkAutoConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.filter.ForwardedHeaderFilter;

class TrustedProxyConfigurationTest {
    private final WebApplicationContextRunner runner = new WebApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(WeiranFrameworkAutoConfiguration.class))
            .withBean(ObjectMapper.class, ObjectMapper::new)
            .withPropertyValues("server.forward-headers-strategy=none");

    @Test
    @DisplayName("默认空列表和显式 CIDR 均可装配，空项与非法配置失败")
    void bindsProperties() {
        this.runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean(TrustedProxyProperties.class).trustedProxies())
                    .isEmpty();
        });
        this.runner
                .withPropertyValues("weiran.web.trusted-proxies=10.0.0.2,2001:db8::/64")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(TrustedProxyProperties.class).trustedProxies())
                            .hasSize(2);
                });
        this.runner
                .withPropertyValues("weiran.web.trusted-proxies=")
                .run(context -> assertThat(context).hasNotFailed());
        for (final String value : new String[] {"localhost", "10.0.0.1,,10.0.0.2", "10.0.0.1/33"}) {
            this.runner
                    .withPropertyValues("weiran.web.trusted-proxies=" + value)
                    .run(context -> assertThat(context).hasFailed());
        }
    }

    @Test
    @DisplayName("拒绝 native/framework 及直接或注册包装的转发过滤器")
    void rejectsForwardingConflicts() {
        new WebApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(WeiranFrameworkAutoConfiguration.class))
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .run(context -> assertThat(context).hasFailed());
        for (final String strategy : new String[] {"native", "framework"}) {
            this.runner
                    .withPropertyValues("server.forward-headers-strategy=" + strategy)
                    .run(context -> assertThat(context).hasFailed());
        }
        this.runner
                .withBean(ForwardedHeaderFilter.class, ForwardedHeaderFilter::new)
                .run(context -> assertThat(context).hasFailed());
        this.runner
                .withBean(
                        "forwardedRegistration",
                        FilterRegistrationBean.class,
                        () -> new FilterRegistrationBean<>(new ForwardedHeaderFilter()))
                .run(context -> assertThat(context).hasFailed());
    }
}
