package com.wulicode.weiran.system.api.batch;

@FunctionalInterface
public interface BatchValidationSink {
    void accept(BatchValidationItem item);
}
