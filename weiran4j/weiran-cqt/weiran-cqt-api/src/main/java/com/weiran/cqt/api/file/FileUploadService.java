package com.weiran.cqt.api.file;

import org.jspecify.annotations.Nullable;

/** 前台文件上传。 */
public interface FileUploadService {

    /**
     * 上传一个文件。
     *
     * @param accountId 上传者账号 ID
     * @param originalName 原始文件名
     * @param size 字节数（0 视为未选择文件）
     * @param content 内容
     * @param contentType MIME 类型
     * @return 上传结果
     */
    UploadedFileView upload(
            long accountId,
            @Nullable String originalName,
            long size,
            UploadContent content,
            @Nullable String contentType);
}
