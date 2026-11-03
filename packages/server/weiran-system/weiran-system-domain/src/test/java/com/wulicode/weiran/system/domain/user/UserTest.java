package com.wulicode.weiran.system.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.framework.status.EnableStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 26, 10, 0);

    private static User user(final long id, final boolean builtin) {
        return User.builder()
                .id(id)
                .username("zhangsan")
                .nickname("张三")
                .passwordHash("hash")
                .gender(Gender.UNKNOWN)
                .status(EnableStatus.ENABLED)
                .tokenVersion(3)
                .builtin(builtin)
                .build();
    }

    @Test
    @DisplayName("改密码令牌版本加一并记录修改时间")
    void passwordChangeBumpsTokenVersion() {
        final User changed = UserTest.user(2L, false).withPassword("new-hash", UserTest.NOW);

        assertThat(changed.getPasswordHash()).isEqualTo("new-hash");
        assertThat(changed.getTokenVersion()).isEqualTo(4);
        assertThat(changed.getPasswordUpdatedAt()).isEqualTo(UserTest.NOW);
    }

    @Test
    @DisplayName("禁用时令牌版本加一，保持启用不变")
    void disablingBumpsTokenVersion() {
        final User user = UserTest.user(2L, false);

        assertThat(user.withAssignment(EnableStatus.DISABLED).getTokenVersion()).isEqualTo(4);
        assertThat(user.withAssignment(EnableStatus.ENABLED).getTokenVersion()).isEqualTo(3);
        final User disabled = user.withAssignment(EnableStatus.DISABLED);
        assertThat(disabled.isEnabled()).isFalse();
        assertThat(disabled.withAssignment(EnableStatus.DISABLED).getTokenVersion())
                .isEqualTo(4);
    }

    @Test
    @DisplayName("内置用户不可禁用、不可删除，任何人不能删除自己")
    void protectsBuiltinAndSelf() {
        assertThatThrownBy(() -> UserTest.user(1L, true).withAssignment(EnableStatus.DISABLED))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        assertThatThrownBy(() -> UserTest.user(1L, true).ensureDeletableBy(9L)).hasMessage("内置用户不可删除");
        assertThatThrownBy(() -> UserTest.user(2L, false).ensureDeletableBy(2L)).hasMessage("不能删除当前登录用户");
        assertThatCode(() -> UserTest.user(2L, false).ensureDeletableBy(1L)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("修改资料与记录登录只改对应字段")
    void updatesProfileAndLogin() {
        final User user = UserTest.user(2L, false)
                .withProfile("新昵称", new UserAvatar("张", "#0064FA"), Gender.FEMALE)
                .withLogin("10.0.0.1", UserTest.NOW);

        assertThat(user.getNickname()).isEqualTo("新昵称");
        assertThat(user.getAvatar()).isEqualTo(new UserAvatar("张", "#0064FA"));
        assertThat(user.getGender()).isEqualTo(Gender.FEMALE);
        assertThat(user.getLastLoginIp()).isEqualTo("10.0.0.1");
        assertThat(user.getLastLoginAt()).isEqualTo(UserTest.NOW);
        assertThat(user.getTokenVersion()).isEqualTo(3);
        assertThat(user.requireId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("文字头像只接受短文本与十六进制背景色")
    void validatesTextAvatar() {
        assertThat(new UserAvatar("张", "#0064FA").background()).isEqualTo("#0064FA");
        assertThatThrownBy(() -> new UserAvatar("张", "https://example.com/avatar.png"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> new UserAvatar("超过四个文字", "#0064FA")).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("未持久化的用户取 ID 抛异常")
    void requireIdOnTransientUser() {
        final User transientUser = UserTest.user(1L, false).toBuilder().id(null).build();
        assertThatThrownBy(transientUser::requireId).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("性别按小写字符串解析，空值为 unknown")
    void parsesGender() {
        assertThat(Gender.of("male")).isEqualTo(Gender.MALE);
        assertThat(Gender.of(null)).isEqualTo(Gender.UNKNOWN);
        assertThat(Gender.FEMALE.value()).isEqualTo("female");
        assertThatThrownBy(() -> Gender.of("x")).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("性别过滤条件：空与空白不过滤，合法值解析，非法值 100001")
    void parsesGenderFilter() {
        assertThat(Gender.filterOf(null)).isNull();
        assertThat(Gender.filterOf(" ")).isNull();
        assertThat(Gender.filterOf("female")).isEqualTo(Gender.FEMALE);
        assertThat(Gender.filterOf("unknown")).isEqualTo(Gender.UNKNOWN);
        assertThatThrownBy(() -> Gender.filterOf("x"))
                .isInstanceOfSatisfying(
                        BizException.class,
                        e -> assertThat(e.getErrorCode().code()).isEqualTo(100001));
    }
}
