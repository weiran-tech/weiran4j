package com.wulicode.weiran.system.api.media;

import org.jspecify.annotations.NullMarked;

/** 文件上传结果。 */
@NullMarked
public record FileUploadView(String url, String name, String path, long size) {}
