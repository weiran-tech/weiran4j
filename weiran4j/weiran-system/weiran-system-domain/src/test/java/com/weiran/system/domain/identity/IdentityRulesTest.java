package com.weiran.system.domain.identity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class IdentityRulesTest {

    @Test
    @DisplayName("回跳路径只接受站内路径：外站、协议相对、反斜杠、控制字符一律回首页")
    void normalizesRedirect() {
        assertThat(RedirectPaths.normalize("/system/users?x=1")).isEqualTo("/system/users?x=1");
        assertThat(RedirectPaths.normalize(null)).isEqualTo("/");
        assertThat(RedirectPaths.normalize("")).isEqualTo("/");
        assertThat(RedirectPaths.normalize("https://evil.com")).isEqualTo("/");
        assertThat(RedirectPaths.normalize("//evil.com")).isEqualTo("/");
        assertThat(RedirectPaths.normalize("/\\evil.com")).isEqualTo("/");
        assertThat(RedirectPaths.normalize("/a\nb")).isEqualTo("/");
        assertThat(RedirectPaths.normalize("/" + "a".repeat(600))).isEqualTo("/");
    }

    @Test
    @DisplayName("自动开通的用户名：合法的外部用户名原样用；不合法时用 provider + 外部标识短哈希，且稳定")
    void derivesUsername() {
        assertThat(ProvisionedUsername.of("kc", "sub-1", "zhangsan")).isEqualTo("zhangsan");
        final String fallback = ProvisionedUsername.of("my-idp", "sub-1", "张三");
        assertThat(fallback).matches("my_idp_[0-9a-f]{10}");
        assertThat(ProvisionedUsername.of("my-idp", "sub-1", null)).isEqualTo(fallback);
        assertThat(ProvisionedUsername.of("my-idp", "sub-2", null)).isNotEqualTo(fallback);
        assertThat(ProvisionedUsername.of("kc", "x", "1abc")).startsWith("kc_");
    }

    @Test
    @DisplayName("流程模式：bind 以外一律视为登录")
    void parsesMode() {
        assertThat(SsoMode.parse("bind")).isEqualTo(SsoMode.BIND);
        assertThat(SsoMode.parse(" BIND ")).isEqualTo(SsoMode.BIND);
        assertThat(SsoMode.parse("login")).isEqualTo(SsoMode.LOGIN);
        assertThat(SsoMode.parse("whatever")).isEqualTo(SsoMode.LOGIN);
    }
}
