package com.weiran.cqt.api.file;

/**
 * 上传结果（字段名即 uniapp 读取的键）。
 *
 * @param url 可公开访问的地址
 * @param name 原始文件名
 * @param path 对象名
 * @param size 字节数
 */
public record UploadedFileView(String url, String name, String path, long size) {}
