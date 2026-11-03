package com.wulicode.weiran.system.api.batch;

import java.io.IOException;
import java.io.InputStream;
import org.jspecify.annotations.Nullable;

/** 每次调用都打开新的输入流，供处理器扫描和处理。 */
@FunctionalInterface
public interface BatchSource {
    InputStream open() throws IOException;

    /** 业务引用型任务可据此读取私有文件清单，无需构造占位文件。 */
    default @Nullable String reference() {
        return null;
    }
}
