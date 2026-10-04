package com.weiran.cqt.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 应用序列（{@code cqt_app_sequences}）：两条语句须在同一连接（同一事务）内执行。 */
public interface CqtSequenceMapper {

    /** 原子自增并把新值放进本连接的 {@code LAST_INSERT_ID()}。 */
    @Insert("INSERT INTO cqt_app_sequences(sequence_name, current_value) VALUES(#{name}, LAST_INSERT_ID(1))"
            + " ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)")
    int bump(@Param("name") String name);

    /** 本连接最近一次 {@code LAST_INSERT_ID(expr)} 的值。 */
    @Select("SELECT LAST_INSERT_ID()")
    long lastInsertId();
}
