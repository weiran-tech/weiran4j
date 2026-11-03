package com.wulicode.weiran.system.api.batch;

/** 处理器确认可向创建人展示的文件格式或内容错误。 */
public class BatchFileException extends RuntimeException {

    private static final long serialVersionUID = 1L;
    private final String publicMessage;

    public BatchFileException(final String message) {
        super(message);
        this.publicMessage = message;
    }

    @Override
    public String getMessage() {
        return this.publicMessage;
    }
}
