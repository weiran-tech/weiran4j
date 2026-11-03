package com.wulicode.weiran.system.api.media;

import org.jspecify.annotations.NullMarked;

/** 资源在某个来源中的引用位置。 */
@NullMarked
public record MediaReferenceLocation(String url, String sourceType, String sourceId, String field, String label) {}
