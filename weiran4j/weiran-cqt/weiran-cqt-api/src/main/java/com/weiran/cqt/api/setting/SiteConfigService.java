package com.weiran.cqt.api.setting;

import java.util.Map;
import org.jspecify.annotations.Nullable;

/** 前台站点配置查询。 */
public interface SiteConfigService {

    /**
     * 读取前台需要的全部站点配置。
     *
     * @return 前台键名 → 取值（字符串、字符串数组或 null），键的顺序固定
     */
    Map<String, @Nullable Object> getConfig();
}
