package com.wulicode.weiran.system.domain.media;

import org.jspecify.annotations.NullMarked;

/** 已登记的资源引用。 */
@NullMarked
public record MediaReference(String url, String sourceType, String sourceId, String field, String label) {}
