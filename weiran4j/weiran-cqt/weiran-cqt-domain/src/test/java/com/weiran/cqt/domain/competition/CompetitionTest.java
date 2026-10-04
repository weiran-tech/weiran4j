package com.weiran.cqt.domain.competition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CompetitionTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 5, 12, 0);

    private static Competition competition(
            final int status,
            final @Nullable LocalDateTime start,
            final @Nullable LocalDateTime end,
            final boolean separate) {
        return new Competition(2L, 2027L, "2027 届", "2027届", 2027, null, status, start, end, separate);
    }

    @Test
    @DisplayName("报名窗口：未启用、未开始、已结束三种提示；窗口内与不限时间可报名")
    void registrationWindow() {
        assertThatThrownBy(() ->
                        CompetitionTest.competition(0, null, null, false).requireOpenForSignup(CompetitionTest.NOW))
                .hasMessage("所选赛事尚未启用");
        assertThatThrownBy(() -> CompetitionTest.competition(
                                1, CompetitionTest.NOW.plusDays(1), CompetitionTest.NOW.plusDays(2), false)
                        .requireOpenForSignup(CompetitionTest.NOW))
                .hasMessage("赛事报名尚未开始");
        assertThatThrownBy(() -> CompetitionTest.competition(1, null, CompetitionTest.NOW.minusDays(1), false)
                        .requireOpenForSignup(CompetitionTest.NOW))
                .hasMessage("赛事报名已经结束");
        assertThatCode(() -> CompetitionTest.competition(
                                1, CompetitionTest.NOW.minusDays(1), CompetitionTest.NOW.plusDays(1), false)
                        .requireOpenForSignup(CompetitionTest.NOW))
                .doesNotThrowAnyException();
        assertThatCode(() ->
                        CompetitionTest.competition(1, null, null, false).requireOpenForSignup(CompetitionTest.NOW))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("前台报名阶段：分别报名为省赛，否则共用")
    void portalStage() {
        assertThat(CompetitionTest.competition(1, null, null, true).portalSignupStage())
                .isEqualTo(EntryStage.PROVINCIAL);
        assertThat(CompetitionTest.competition(1, null, null, false).portalSignupStage())
                .isEqualTo(EntryStage.BOTH);
    }

    @Test
    @DisplayName("阶段冲突矩阵：BOTH 与任何阶段冲突，同阶段冲突，省赛与国赛不冲突")
    void stageConflicts() {
        assertThat(EntryStage.BOTH.conflictsWith(EntryStage.NATIONAL)).isTrue();
        assertThat(EntryStage.NATIONAL.conflictsWith(EntryStage.BOTH)).isTrue();
        assertThat(EntryStage.PROVINCIAL.conflictsWith(EntryStage.PROVINCIAL)).isTrue();
        assertThat(EntryStage.PROVINCIAL.conflictsWith(EntryStage.NATIONAL)).isFalse();
        assertThat(EntryStage.NATIONAL.conflictsWith(EntryStage.PROVINCIAL)).isFalse();
        assertThat(EntryStage.ofStored("NATIONAL")).isEqualTo(EntryStage.NATIONAL);
        assertThat(EntryStage.ofStored("x")).isEqualTo(EntryStage.BOTH);
    }

    @Test
    @DisplayName("赛项：启用与一级判断")
    void category() {
        assertThat(new Category(1, 0, "戏剧", 1, 1, true).isFirstLevel()).isTrue();
        assertThat(new Category(11, 1, "表演", 1, 0, false).isEnabled()).isFalse();
    }
}
