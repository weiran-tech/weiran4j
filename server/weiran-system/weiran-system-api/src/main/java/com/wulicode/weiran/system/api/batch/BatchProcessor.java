package com.wulicode.weiran.system.api.batch;

/** 业务模块实现此接口并注册为 Spring Bean；基座只负责任务编排。 */
public interface BatchProcessor {
    String kind();

    String extension();

    /** 创建任务时校验该处理器的业务权限；拒绝时抛业务异常。 */
    void authorize(long userId);

    default long maxBytes() {
        return 100L * 1024 * 1024;
    }

    /** 每个数据库事务处理的项数；默认保持逐项提交。 */
    default int transactionBatchSize() {
        return 1;
    }

    /** 业务引用处理器返回 REFERENCE，并用原始引用及其不可变指纹打开输入。 */
    default BatchInputMode inputMode() {
        return BatchInputMode.MANAGED_FILE;
    }

    default BatchSource referenceSource(final String reference) {
        return () -> {
            throw new UnsupportedOperationException("业务引用没有单个输入流");
        };
    }

    /** 指纹应覆盖业务私有文件和文件清单的全部内容；每次恢复及入库前重新计算。 */
    default String referenceFingerprint(final String reference) throws Exception {
        throw new UnsupportedOperationException("处理器不支持业务引用");
    }

    /** 扫描完整输入，对每个识别出的处理项调用一次 sink；不得写目标业务数据。 */
    void precheck(BatchSource source, BatchValidationSink sink) throws Exception;

    /** 按稳定项编号执行一次业务写入；调用方会把本方法和 processing 成功记录放在同一事务。 */
    BatchItemResult processItem(BatchSource source, long taskId, long itemNo, String idempotencyKey) throws Exception;
}
