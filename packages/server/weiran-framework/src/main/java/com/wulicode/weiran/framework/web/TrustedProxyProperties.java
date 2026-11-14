package com.wulicode.weiran.framework.web;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** 显式可信代理，默认没有任何可信来源。 */
@ConfigurationProperties("weiran.web")
public record TrustedProxyProperties(@DefaultValue List<String> trustedProxies) {
    public TrustedProxyProperties {
        trustedProxies = List.copyOf(trustedProxies);
    }
}
