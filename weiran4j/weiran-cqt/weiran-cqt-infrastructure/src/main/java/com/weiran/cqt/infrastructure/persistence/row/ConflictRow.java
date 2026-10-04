package com.weiran.cqt.infrastructure.persistence.row;

import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** 参赛冲突查询行。 */
@NullUnmarked
@Getter
@Setter
public class ConflictRow {

    private String sourceDatabase;

    private String entryNo;

    private String title;
}
