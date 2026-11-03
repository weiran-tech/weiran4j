package com.wulicode.weiran.system.domain.storage;

/** 文件存储失败，消息不包含凭据。 */
public class FileStorageException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public FileStorageException(final String message, final Throwable cause) {
        super(message, cause);
    }

    public FileStorageException(final String message) {
        super(message);
    }
}
