package com.wulicode.weiran.system.api.media;

import java.util.List;

/** 当前上传限制，供前端选择文件时提前校验。 */
public record MediaUploadSettingsView(
        List<String> imageFormats, int imageMaxSizeMb, int videoMaxSizeMb, List<String> fileFormats) {}
