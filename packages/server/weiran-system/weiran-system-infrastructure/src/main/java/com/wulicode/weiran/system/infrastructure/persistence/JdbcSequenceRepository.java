package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.system.domain.sequence.SequenceRepository;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;

/** MySQL 行锁串行化同一类型的序号递增。 */
public class JdbcSequenceRepository implements SequenceRepository {

    private final JdbcTemplate jdbc;

    public JdbcSequenceRepository(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Allocation next(final String type) {
        this.jdbc.update(
                "insert into sys_sequence (type, sequence) values (?, 1) "
                        + "on duplicate key update sequence = sequence + 1",
                type);
        return Objects.requireNonNull(this.jdbc.queryForObject(
                "select id, sequence from sys_sequence where type = ?",
                (row, index) -> new Allocation(row.getLong("id"), row.getLong("sequence")),
                type));
    }
}
