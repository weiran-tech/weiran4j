package com.wulicode.weiran.system.api.sequence;

/** 序号分配结果：id 标识类型计数器，(type, sequence) 标识本次分配。 */
public record SequenceValue(long id, String type, long sequence) {}
