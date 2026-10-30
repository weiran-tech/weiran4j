package com.wulicode.weiran.system.api.media;

/** 浏览器直传成功后提交的对象信息。 */
public record CompleteDirectUploadRequest(String originalName, String objectName, long size, String ticket) {}
