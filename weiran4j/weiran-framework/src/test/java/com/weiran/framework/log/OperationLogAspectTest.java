package com.weiran.framework.log;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.common.error.BizException;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class OperationLogAspectTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-26T02:00:00Z"), ZoneOffset.ofHours(8));

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final List<OperationLogEvent> events = new ArrayList<>();

    /** 被代理的目标：必须是非 final 的公开类，CGLIB 才能生成子类。 */
    public static class Target {

        @OperationLog(module = "用户管理", description = "新增用户")
        public String create(@RequestBody final Map<String, Object> body) {
            return "created";
        }

        @OperationLog(module = "用户管理", description = "删除用户")
        public void delete() {
            throw BizException.conflict("内置用户不可删除");
        }

        public String plain() {
            return "plain";
        }
    }

    @BeforeEach
    void bindRequest() {
        final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/users");
        request.setRemoteAddr("192.168.1.8");
        request.addHeader("User-Agent", "curl/8.7.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void unbindRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    private Target proxy(final boolean withRecorder) {
        final DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
        if (withRecorder) {
            beanFactory.registerSingleton("recorder", (OperationLogRecorder) this.events::add);
        }
        final OperationLogAspect aspect = new OperationLogAspect(
                beanFactory.getBeanProvider(OperationLogRecorder.class),
                this.objectMapper,
                OperationLogAspectTest.CLOCK);
        final AspectJProxyFactory factory = new AspectJProxyFactory(new Target());
        factory.setProxyTargetClass(true);
        factory.addAspect(aspect);
        return factory.getProxy();
    }

    @Test
    @DisplayName("成功请求记录脱敏后的请求体、操作人与请求信息")
    void recordsMaskedSuccess() throws Exception {
        final Target target = this.proxy(true);
        final LoginUser admin = new LoginUser(1L, "admin", "管理员", Set.of("super_admin"), Set.of());

        CurrentUser.runAs(
                admin,
                () -> assertThat(target.create(Map.of(
                                "username", "lisi", "password", "Secret123", "profile", Map.of("newPassword", "x1"))))
                        .isEqualTo("created"));

        assertThat(this.events).hasSize(1);
        final OperationLogEvent event = this.events.get(0);
        assertThat(event.userId()).isEqualTo(1L);
        assertThat(event.username()).isEqualTo("admin");
        assertThat(event.module()).isEqualTo("用户管理");
        assertThat(event.description()).isEqualTo("新增用户");
        assertThat(event.method()).isEqualTo("POST");
        assertThat(event.path()).isEqualTo("/api/users");
        assertThat(event.ip()).isEqualTo("192.168.1.8");
        assertThat(event.userAgent()).isEqualTo("curl/8.7.1");
        assertThat(event.success()).isTrue();
        assertThat(event.responseCode()).isZero();
        assertThat(event.createdAt()).isEqualTo(LocalDateTime.of(2026, 9, 26, 10, 0));
        final JsonNode body = this.objectMapper.readTree(event.requestBody());
        assertThat(body.path("username").asText()).isEqualTo("lisi");
        assertThat(body.path("password").asText()).isEqualTo(SensitiveDataMasker.MASK);
        assertThat(body.path("profile").path("newPassword").asText()).isEqualTo(SensitiveDataMasker.MASK);
    }

    @Test
    @DisplayName("业务异常记录错误码与提示语，并原样抛出")
    void recordsFailure() {
        final Target target = this.proxy(true);

        assertThatThrownBy(target::delete).isInstanceOf(BizException.class);

        assertThat(this.events).singleElement().satisfies(event -> {
            assertThat(event.success()).isFalse();
            assertThat(event.responseCode()).isEqualTo(40901);
            assertThat(event.errorMessage()).isEqualTo("内置用户不可删除");
            assertThat(event.userId()).isNull();
            assertThat(event.requestBody()).isNull();
        });
    }

    @Test
    @DisplayName("没有 recorder 时切面不生效，未标注的方法不记录")
    void skipsWithoutRecorder() {
        assertThat(this.proxy(false).create(Map.of())).isEqualTo("created");
        assertThat(this.proxy(true).plain()).isEqualTo("plain");
        assertThat(this.events).isEmpty();
    }

    @Test
    @DisplayName("超长文本截断且总长不超过上限")
    void truncatesLongText() {
        final String longText = "x".repeat(5000);
        final String truncated = SensitiveDataMasker.truncate(longText, SensitiveDataMasker.MAX_BODY_LENGTH);
        assertThat(truncated).hasSize(SensitiveDataMasker.MAX_BODY_LENGTH).endsWith("...");
        assertThat(SensitiveDataMasker.truncate("short", 10)).isEqualTo("short");
        assertThat(SensitiveDataMasker.isSensitive("accessToken")).isTrue();
        assertThat(SensitiveDataMasker.isSensitive("nickname")).isFalse();
    }
}
