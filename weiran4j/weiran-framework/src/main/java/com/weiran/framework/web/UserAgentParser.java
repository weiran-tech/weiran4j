package com.weiran.framework.web;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 手写的 User-Agent 解析：只识别主流浏览器与操作系统，用于登录日志展示。
 *
 * <p>不引入 UA 解析库：日志展示不需要精确到设备型号，而那类库的规则库体积与更新频率都不划算。
 * 规则按「更具体的先匹配」排列——Edge/Opera 的 UA 里同时带着 Chrome 与 Safari 字样，
 * iPad 的 UA 里带着 Mac OS X，Android 的 UA 里带着 Linux。
 */
public final class UserAgentParser {

    /** 无法识别时的取值。 */
    public static final String UNKNOWN = "Unknown";

    private static final List<Rule> BROWSERS = List.of(
            new Rule("Edge", Pattern.compile("Edg(?:e|A|iOS)?/(\\d+)")),
            new Rule("Opera", Pattern.compile("(?:OPR|Opera)/(\\d+)")),
            new Rule("Firefox", Pattern.compile("(?:Firefox|FxiOS)/(\\d+)")),
            new Rule("Chrome", Pattern.compile("(?:Chrome|CriOS)/(\\d+)")),
            new Rule("Safari", Pattern.compile("Version/(\\d+)[^ ]* (?:Mobile/\\S+ )?Safari/")),
            new Rule("IE", Pattern.compile("(?:MSIE |Trident/.*rv:)(\\d+)")),
            new Rule("Postman", Pattern.compile("PostmanRuntime/(\\d+)")),
            new Rule("curl", Pattern.compile("curl/(\\d+)")),
            new Rule("OkHttp", Pattern.compile("okhttp/(\\d+)")),
            new Rule("Java", Pattern.compile("Java/(\\d+)")));

    private static final List<Rule> SYSTEMS = List.of(
            new Rule("iOS", Pattern.compile("iPhone|iPad|iPod")),
            new Rule("Android", Pattern.compile("Android")),
            new Rule("Windows", Pattern.compile("Windows")),
            new Rule("macOS", Pattern.compile("Mac OS X|Macintosh")),
            new Rule("ChromeOS", Pattern.compile("CrOS")),
            new Rule("Linux", Pattern.compile("Linux")));

    private UserAgentParser() {}

    /** 解析 User-Agent；空值返回两个 {@link #UNKNOWN}。 */
    public static UserAgentInfo parse(final @Nullable String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return new UserAgentInfo(UserAgentParser.UNKNOWN, UserAgentParser.UNKNOWN);
        }
        return new UserAgentInfo(UserAgentParser.browserOf(userAgent), UserAgentParser.osOf(userAgent));
    }

    private static String browserOf(final String userAgent) {
        for (final Rule rule : UserAgentParser.BROWSERS) {
            final Matcher matcher = rule.pattern().matcher(userAgent);
            if (matcher.find()) {
                return rule.name() + " " + matcher.group(1);
            }
        }
        return UserAgentParser.UNKNOWN;
    }

    private static String osOf(final String userAgent) {
        for (final Rule rule : UserAgentParser.SYSTEMS) {
            if (rule.pattern().matcher(userAgent).find()) {
                return rule.name();
            }
        }
        return UserAgentParser.UNKNOWN;
    }

    private record Rule(String name, Pattern pattern) {}
}
