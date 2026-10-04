package com.weiran.cqt.domain.competition;

/** 作品适用阶段：省国赛共用（BOTH）、仅省赛（PROVINCIAL）、仅国赛（NATIONAL）。 */
public enum EntryStage {

    /** 省赛、国赛共用同一作品。 */
    BOTH,

    /** 仅省赛。 */
    PROVINCIAL,

    /** 仅国赛。 */
    NATIONAL;

    /**
     * 与另一阶段的参赛记录是否冲突：任一方为 {@link #BOTH}，或两者相同即冲突；{@link #PROVINCIAL} 与 {@link #NATIONAL} 互不冲突。
     */
    public boolean conflictsWith(final EntryStage other) {
        return this == EntryStage.BOTH || other == EntryStage.BOTH || this == other;
    }

    /** 按库中存储值解析，无法识别时视为 {@link #BOTH}。 */
    public static EntryStage ofStored(final String stored) {
        for (final EntryStage stage : EntryStage.values()) {
            if (stage.name().equals(stored)) {
                return stage;
            }
        }
        return EntryStage.BOTH;
    }
}
