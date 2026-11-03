package com.wulicode.weiran.system.domain.batch;

import java.io.IOException;
import java.io.InputStream;

/** 私有任务输入与错误报告的存储端口。 */
public interface BatchFileStorage {
    String store(String filename, InputStream input, long size);

    InputStream open(String key) throws IOException;

    void delete(String key);
}
