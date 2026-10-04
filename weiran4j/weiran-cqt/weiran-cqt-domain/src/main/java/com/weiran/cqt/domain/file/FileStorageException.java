package com.weiran.cqt.domain.file;

import java.io.Serial;

/** 文件写入存储失败（网络、权限、磁盘等）。信息里不得含凭据。 */
public class FileStorageException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 构造异常。 */
    public FileStorageException(final String message, final Throwable cause) {
        super(message, cause);
    }
}
