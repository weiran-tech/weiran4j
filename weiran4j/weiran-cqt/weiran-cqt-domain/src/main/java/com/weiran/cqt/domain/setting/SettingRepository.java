package com.weiran.cqt.domain.setting;

import java.util.Map;
import org.jspecify.annotations.Nullable;

/** 站点配置仓储端口。 */
public interface SettingRepository {

    /**
     * 读取编号落在闭区间内的配置项内容。
     *
     * @param from 起始编号（含）
     * @param to 结束编号（含）
     * @return 编号 → 内容；内容为 NULL 的行也在结果里（值为 null），没有行的编号不在结果里
     */
    Map<Integer, @Nullable String> findContentsByIdentRange(int from, int to);
}
