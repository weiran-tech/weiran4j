package com.weiran.cqt.domain.entry;

import com.weiran.framework.error.BizException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 作品附件（口径沿用原系统 {@code validate_direct_attachment}）。
 *
 * @param type 类型
 * @param url 地址，未提交时为 null
 * @param name 附件名，缺省取地址
 */
public record Attachment(
        AttachmentType type, @Nullable String url, @Nullable String name) {

    private static final Pattern HAN = Pattern.compile("[\\u4e00-\\u9fff]");

    /**
     * 解析并校验附件。
     *
     * @param rawType 前台类型：ZIP / 文件 / 压缩包 / LINK / 链接
     * @param rawUrl 地址
     * @param rawName 附件名
     * @param required 赛项是否要求附件
     * @param isStoredUrl 判定地址是否由本系统存储产生
     */
    public static Attachment parse(
            final @Nullable String rawType,
            final @Nullable String rawUrl,
            final @Nullable String rawName,
            final boolean required,
            final Predicate<String> isStoredUrl) {
        final AttachmentType type = Attachment.type(rawType);
        final String url = rawUrl == null ? "" : rawUrl.strip();
        final String name = rawName == null ? "" : rawName.strip();
        if (url.isEmpty()) {
            if (required) {
                throw BizException.badRequest("当前赛项要求提交作品附件");
            }
            return new Attachment(type, null, null);
        }
        if (type == AttachmentType.LINK) {
            if (!Attachment.isHttpUrl(url)) {
                throw BizException.badRequest("链接附件必须是以http://或https://开头的完整网址");
            }
            if (Attachment.HAN.matcher(url).find()) {
                throw BizException.badRequest("链接附件不能包含汉字");
            }
        } else {
            if (!isStoredUrl.test(url)
                    || !Attachment.path(url).toLowerCase(Locale.ROOT).endsWith(".zip")) {
                throw BizException.badRequest("ZIP附件必须选择并上传本系统中的.zip压缩包");
            }
            if (!name.isEmpty() && !name.toLowerCase(Locale.ROOT).endsWith(".zip")) {
                throw BizException.badRequest("ZIP附件文件名必须以.zip结尾");
            }
        }
        return new Attachment(type, url, name.isEmpty() ? url : name);
    }

    private static AttachmentType type(final @Nullable String rawType) {
        final String value = rawType == null ? "" : rawType.strip().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "ZIP", "文件", "压缩包" -> AttachmentType.ZIP;
            case "LINK", "链接" -> AttachmentType.LINK;
            default -> throw BizException.badRequest("请选择附件类型：ZIP或链接");
        };
    }

    private static boolean isHttpUrl(final String url) {
        try {
            final URI uri = new URI(url);
            final String scheme = uri.getScheme();
            return ("http".equals(scheme) || "https".equals(scheme)) && uri.getHost() != null;
        } catch (final URISyntaxException ex) {
            // 含汉字等非法字符时 URI 解析失败：交给「不能包含汉字」或「完整网址」两条提示之一。
            return url.startsWith("http://") || url.startsWith("https://");
        }
    }

    private static String path(final String url) {
        final int query = url.indexOf('?');
        final int fragment = url.indexOf('#');
        int end = url.length();
        if (query >= 0) {
            end = query;
        }
        if (fragment >= 0 && fragment < end) {
            end = fragment;
        }
        return url.substring(0, end);
    }
}
