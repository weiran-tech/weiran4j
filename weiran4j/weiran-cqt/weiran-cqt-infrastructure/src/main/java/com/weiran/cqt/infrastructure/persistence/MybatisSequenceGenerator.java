package com.weiran.cqt.infrastructure.persistence;

import com.weiran.cqt.domain.entry.SequenceGenerator;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtSequenceMapper;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link SequenceGenerator} 的 MySQL 实现：{@code ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)}
 * 行锁保证并发安全；两条语句必须落在同一连接，故整个方法在一个事务内（调用方已有事务时加入）。
 */
public class MybatisSequenceGenerator implements SequenceGenerator {

    private final CqtSequenceMapper sequenceMapper;

    /** 构造序列。 */
    public MybatisSequenceGenerator(final CqtSequenceMapper sequenceMapper) {
        this.sequenceMapper = sequenceMapper;
    }

    @Override
    @Transactional
    public long next(final String name) {
        this.sequenceMapper.bump(name);
        return this.sequenceMapper.lastInsertId();
    }
}
