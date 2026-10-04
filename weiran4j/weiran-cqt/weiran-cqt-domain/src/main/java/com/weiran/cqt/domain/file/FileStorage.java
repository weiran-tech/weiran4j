package com.weiran.cqt.domain.file;

import java.io.InputStream;
import org.jspecify.annotations.Nullable;

/** 文件存储端口。未注册任何实现时视为「文件存储未配置」。 */
public interface FileStorage {

    /**
     * 写入一个对象。实现必须流式写入，不得把内容整体读入内存。
     *
     * @param objectName 对象名（相对路径，不以 {@code /} 开头）
     * @param content 内容
     * @param size 字节数
     * @param contentType MIME 类型
     * @return 可公开访问的地址
     * @throws FileStorageException 写入失败
     */
    String store(String objectName, InputStream content, long size, @Nullable String contentType);
}
