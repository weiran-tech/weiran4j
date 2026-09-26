package com.weiran.framework.time;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * 全仓统一的时区与时间格式。
 *
 * <p>数据库 {@code datetime} 不带时区，读写两端必须约定同一个时区才不会漂移：
 * 应用内一律用 {@link #ZONE}，JDBC URL 里的 {@code serverTimezone} 也应与之一致。
 */
public final class WeiranTime {

    /** 业务时区。 */
    public static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");

    /** 日期时间格式。 */
    public static final String DATE_TIME_PATTERN = "yyyy-MM-dd HH:mm:ss";

    /** 日期格式。 */
    public static final String DATE_PATTERN = "yyyy-MM-dd";

    /** 时间格式。 */
    public static final String TIME_PATTERN = "HH:mm:ss";

    /** 日期时间格式化器。 */
    public static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern(WeiranTime.DATE_TIME_PATTERN, Locale.ROOT);

    /** 日期格式化器。 */
    public static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern(WeiranTime.DATE_PATTERN, Locale.ROOT);

    /** 时间格式化器。 */
    public static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern(WeiranTime.TIME_PATTERN, Locale.ROOT);

    private WeiranTime() {}
}
