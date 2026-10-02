package com.weiran.cqt.domain.setting;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SiteConfigTest {

    @Test
    @DisplayName("返回恰好 22 个前台键，缺行的配置项为 null")
    void returnsAllKeysWithNullForMissingRows() {
        final Map<String, @Nullable Object> config = SiteConfig.build(Map.of());

        assertThat(config)
                .containsOnlyKeys(
                        "guanyuwomen",
                        "user_agreement",
                        "yinsixieyi",
                        "about_us",
                        "dizhi",
                        "shouji",
                        "weixin",
                        "youxiang",
                        "gongsijieshao",
                        "hezuohuoban",
                        "dasaijieshao",
                        "mianzexieyi",
                        "shouhoufuwu",
                        "shangwuhezuo",
                        "gongzuoshijian",
                        "dasaizhangcheng",
                        "gongzhonghao",
                        "certificate_visibility",
                        "sheng_certificate_visibility",
                        "guo_certificate_visibility",
                        "teacher_org_certificate_competition_id",
                        "shouyeimage");
        assertThat(config.get("weixin")).isNull();
        assertThat(config.get("gongzhonghao")).isEqualTo(List.of());
    }

    @Test
    @DisplayName("字符串去 HTML 标签与首尾空白；同一编号映射到两个键")
    void stripsHtmlAndSharesIdent() {
        final Map<String, @Nullable Object> config =
                SiteConfig.build(Map.of(7, "<p>北京市 <b>东城区</b></p> ", 2, "<div>关于我们</div>"));

        assertThat(config.get("dizhi")).isEqualTo("北京市 东城区");
        assertThat(config.get("guanyuwomen")).isEqualTo("关于我们");
        assertThat(config.get("user_agreement")).isEqualTo("关于我们");
    }

    @Test
    @DisplayName("内容为 NULL 的行返回 null，空串返回空串")
    void keepsNullAndEmpty() {
        final Map<Integer, @Nullable String> rows = new HashMap<>();
        rows.put(8, null);
        rows.put(10, "");

        final Map<String, @Nullable Object> config = SiteConfig.build(rows);

        assertThat(config.get("shouji")).isNull();
        assertThat(config.get("youxiang")).isEqualTo("");
    }

    @Test
    @DisplayName("公众号返回单元素原值数组，不去标签；空值为空数组")
    void wechatOfficialAccountIsArray() {
        assertThat(SiteConfig.build(Map.of(23, "<img src=\"/uploads/qr.png\">")).get("gongzhonghao"))
                .isEqualTo(List.of("<img src=\"/uploads/qr.png\">"));
        assertThat(SiteConfig.build(Map.of(23, "")).get("gongzhonghao")).isEqualTo(List.of());
    }
}
