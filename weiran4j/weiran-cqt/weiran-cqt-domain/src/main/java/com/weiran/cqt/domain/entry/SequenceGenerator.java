package com.weiran.cqt.domain.entry;

/** 应用序列（并发安全、单调递增）。 */
public interface SequenceGenerator {

    /** 取下一个值。 */
    long next(String name);
}
