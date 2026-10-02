package com.weiran.cqt.domain.setting;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 前台站点配置的组装规则：配置项编号 → 前台键名，以及内容清洗。
 *
 * <p>口径沿用原 FastAPI 实现（{@code routes/product.py} 的 {@code CONFIG_IDENT_MAP}），uniapp 各页面按这些键名读取，
 * 键名与取值形状不得随意改动。
 */
public final class SiteConfig {

    /** 读取的编号下限（含）。 */
    public static final int IDENT_FROM = 1;

    /** 读取的编号上限（含）。 */
    public static final int IDENT_TO = 100;

    /** 公众号：唯一返回数组、且不清洗的配置项。 */
    static final int WECHAT_OFFICIAL_ACCOUNT_IDENT = 23;

    /** 前台键名 → 配置项编号；顺序即返回顺序。{@code guanyuwomen} 与 {@code user_agreement} 同指编号 2 是原口径。 */
    static final Map<String, Integer> IDENT_BY_KEY = SiteConfig.identByKey();

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");

    private SiteConfig() {}

    /**
     * 按前台键名组装配置。
     *
     * @param contentsByIdent 编号 → 原始内容（来自仓储，缺行的编号不在其中）
     * @return 前台键名 → 取值：字符串去 HTML 标签与首尾空白，内容为 NULL 或缺行时为 null；
     *     公众号为数组（有值时单元素原值，否则空数组）
     */
    public static Map<String, @Nullable Object> build(final Map<Integer, @Nullable String> contentsByIdent) {
        final Map<String, @Nullable Object> result = new LinkedHashMap<>();
        SiteConfig.IDENT_BY_KEY.forEach((key, ident) -> {
            final String contents = contentsByIdent.get(ident);
            if (ident == SiteConfig.WECHAT_OFFICIAL_ACCOUNT_IDENT) {
                result.put(key, contents == null || contents.isEmpty() ? List.of() : List.of(contents));
            } else {
                result.put(key, contents == null ? null : SiteConfig.stripHtml(contents));
            }
        });
        return Collections.unmodifiableMap(result);
    }

    /** 去掉全部 HTML 标签与首尾空白。 */
    static String stripHtml(final String value) {
        return SiteConfig.HTML_TAG.matcher(value).replaceAll("").strip();
    }

    private static Map<String, Integer> identByKey() {
        final Map<String, Integer> map = new LinkedHashMap<>();
        map.put("guanyuwomen", 2);
        map.put("user_agreement", 2);
        map.put("yinsixieyi", 3);
        map.put("about_us", 4);
        map.put("dizhi", 7);
        map.put("shouji", 8);
        map.put("weixin", 9);
        map.put("youxiang", 10);
        map.put("gongsijieshao", 15);
        map.put("hezuohuoban", 16);
        map.put("dasaijieshao", 17);
        map.put("mianzexieyi", 18);
        map.put("shouhoufuwu", 19);
        map.put("shangwuhezuo", 20);
        map.put("gongzuoshijian", 21);
        map.put("dasaizhangcheng", 22);
        map.put("gongzhonghao", SiteConfig.WECHAT_OFFICIAL_ACCOUNT_IDENT);
        map.put("certificate_visibility", 67);
        map.put("sheng_certificate_visibility", 68);
        map.put("guo_certificate_visibility", 70);
        map.put("teacher_org_certificate_competition_id", 69);
        map.put("shouyeimage", 66);
        return Collections.unmodifiableMap(map);
    }
}
