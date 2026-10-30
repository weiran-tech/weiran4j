package com.wulicode.weiran.system.api.media;

import java.time.Instant;

/** 浏览器上传 OSS 所需的短时表单授权。 */
public record DirectUploadView(
        String uploadUrl,
        String keyPrefix,
        String accessKeyId,
        String policy,
        String signature,
        Instant expiresAt,
        String ticket) {}
