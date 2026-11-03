package com.wulicode.weiran.system.domain.sequence;

/** 分类型计数器的持久化端口。调用方必须提供独立事务边界。 */
public interface SequenceRepository {
    Allocation next(String type);

    record Allocation(long id, long sequence) {}
}
