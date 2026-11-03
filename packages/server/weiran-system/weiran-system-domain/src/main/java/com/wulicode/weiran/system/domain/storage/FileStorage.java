package com.wulicode.weiran.system.domain.storage;

import java.io.InputStream;

/** 图片对象存储端口。 */
public interface FileStorage {

    StoredFile store(String originalName, InputStream input, long size, long userId);

    void delete(String objectName);

    record StoredFile(String url, String objectName, long size) {}
}
