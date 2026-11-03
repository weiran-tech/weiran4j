package com.wulicode.weiran.region.domain.region;

import com.wulicode.weiran.framework.error.BizException;
import java.util.Arrays;

/** 行政区划级别。 */
public enum RegionLevel {

    /** 省级地区。 */
    PROVINCE("province", 1),

    /** 地级地区。 */
    CITY("city", 2),

    /** 县级地区。 */
    COUNTY("county", 3);

    private final String value;

    private final int depth;

    RegionLevel(final String value, final int depth) {
        this.value = value;
        this.depth = depth;
    }

    /** API 使用的字符串值。 */
    public String value() {
        return this.value;
    }

    /** 层级深度。 */
    public int depth() {
        return this.depth;
    }

    /** 解析级别；不支持的值按参数错误处理。 */
    public static RegionLevel of(final String value) {
        return Arrays.stream(RegionLevel.values())
                .filter(level -> level.value.equals(value))
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("level: 取值只能是 province、city 或 county"));
    }

    /** 是否可作为给定地区的直接子级。 */
    public boolean isChildOf(final RegionLevel parent) {
        return this.depth == parent.depth + 1;
    }
}
