package com.wulicode.weiran.system.api.media;

import java.time.Instant;
import org.jspecify.annotations.NullMarked;

/** 媒体库列表项。 */
@NullMarked
public record MediaView(
        long id,
        String originalName,
        String url,
        long size,
        Instant createdAt,
        String category,
        java.util.List<String> references) {}
