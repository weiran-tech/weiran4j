package com.wulicode.weiran.system.api.sequence;

/** 为不同业务类型分配持久化序号。 */
public interface SequenceService {
    SequenceValue next(String type);
}
