package com.weiran.cqt.domain.entry;

import java.io.Serial;

/** 写入参赛唯一键时撞上同阶段的已有记录（并发重复报名）。 */
public class DuplicateParticipationException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 构造异常。 */
    public DuplicateParticipationException(final Throwable cause) {
        super("参赛唯一键冲突", cause);
    }
}
