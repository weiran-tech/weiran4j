package com.weiran.cqt.api.file;

import java.io.IOException;
import java.io.InputStream;

/** 上传内容的输入流供应：只在真正写入存储时才打开，避免校验失败也打开大文件。 */
@FunctionalInterface
public interface UploadContent {

    /** 打开输入流（调用方负责关闭）。 */
    InputStream open() throws IOException;
}
