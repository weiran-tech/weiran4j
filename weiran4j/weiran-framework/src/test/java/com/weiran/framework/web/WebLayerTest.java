package com.weiran.framework.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.response.ApiResponse;
import com.weiran.framework.auth.AuthCookies;
import com.weiran.framework.auth.AuthInterceptor;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import com.weiran.framework.auth.PublicApi;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.framework.auth.TokenAuthenticator;
import jakarta.servlet.http.Cookie;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

class WebLayerTest {

    /** 张三（id=2）的 CSRF 值。 */
    private static final String USER_CSRF = "2.abc";

    /** {@code /api/test/write} 被执行的次数：CSRF 被拒时业务代码不应执行。 */
    private static final AtomicInteger WRITES = new AtomicInteger();

    private MockMvc mockMvc;

    @RestController
    @RequestMapping("/api/test")
    static class TestController {

        @PublicApi
        @GetMapping("/public")
        String publicText() {
            return "hello";
        }

        @GetMapping("/me")
        String me() {
            return CurrentUser.require().username();
        }

        @PostMapping("/write")
        String write() {
            WebLayerTest.WRITES.incrementAndGet();
            return CurrentUser.require().username();
        }

        @RequiresPermission("system:user:list")
        @GetMapping("/perm")
        ApiResponse<Void> permitted() {
            return ApiResponse.ok();
        }

        @PublicApi
        @PostMapping("/body")
        Payload body(@Valid @RequestBody final Payload payload) {
            return payload;
        }

        @PublicApi
        @GetMapping("/biz")
        String biz() {
            throw BizException.conflict("内置数据不可删除");
        }

        @PublicApi
        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("secret detail");
        }

        @PublicApi
        @GetMapping("/duplicate")
        String duplicate() {
            throw new DuplicateKeyException("Duplicate entry 'x' for key 'uk_username'");
        }
    }

    record Payload(@NotBlank(message = "不能为空") String name) {}

    /** 模拟下游给 uniapp 的接口：整个类自定包络。 */
    @SkipApiResponse
    @RestController
    @RequestMapping("/api-web/skip")
    static class SkippedController {

        @GetMapping("/object")
        Map<String, Object> object() {
            return Map.of("code", 200, "msg", "ok");
        }

        @GetMapping("/text")
        String text() {
            return "pong";
        }
    }

    /** 下游自己组合的注解，以 {@link SkipApiResponse} 为元注解。 */
    @SkipApiResponse
    @Retention(RetentionPolicy.RUNTIME)
    @interface WebApi {}

    @RestController
    @RequestMapping("/api-web/mixed")
    static class MixedController {

        @SkipApiResponse
        @GetMapping("/skipped")
        Map<String, Object> skipped() {
            return Map.of("code", 200);
        }

        @WebApi
        @GetMapping("/meta")
        Map<String, Object> meta() {
            return Map.of("code", 200);
        }

        @GetMapping("/wrapped")
        Map<String, Object> wrapped() {
            return Map.of("code", 200);
        }
    }

    @BeforeEach
    void setUp() {
        final ObjectMapper objectMapper = new ObjectMapper();
        final DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
        final TokenAuthenticator authenticator = token -> switch (token) {
            case "user" -> Optional.of(new LoginUser(2L, "zhangsan", "张三", Set.of("editor"), Set.of()));
            case "admin" ->
                Optional.of(new LoginUser(1L, "admin", "管理员", Set.of(LoginUser.SUPER_ADMIN_ROLE), Set.of()));
            default -> Optional.empty();
        };
        beanFactory.registerSingleton("authenticator", authenticator);
        WebLayerTest.WRITES.set(0);
        this.mockMvc = MockMvcBuilders.standaloneSetup(
                        new TestController(), new SkippedController(), new MixedController())
                .setControllerAdvice(new ApiResponseBodyAdvice(objectMapper), new GlobalExceptionHandler())
                .addMappedInterceptors(
                        new String[] {"/api/**"},
                        new AuthInterceptor(beanFactory.getBeanProvider(TokenAuthenticator.class)))
                .build();
    }

    @Test
    @DisplayName("String 返回值被包成 JSON 统一响应，code 为数字 0")
    void wrapsStringReturnValue() throws Exception {
        this.mockMvc
                .perform(get("/api/test/public"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.message").value("ok"))
                .andExpect(jsonPath("$.data").value("hello"));
    }

    @Test
    @DisplayName("未登录访问非公开接口返回 401 / 40100")
    void rejectsAnonymous() throws Exception {
        this.mockMvc
                .perform(get("/api/test/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100));
        this.mockMvc
                .perform(get("/api/test/me").header("Authorization", "Bearer nope"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("登录后可读当前用户，请求结束后上下文被清理")
    void exposesCurrentUser() throws Exception {
        this.mockMvc
                .perform(get("/api/test/me").header("Authorization", "Bearer user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("zhangsan"));
        assertThat(CurrentUser.get()).isEmpty();
    }

    @Test
    @DisplayName("没有 Bearer 头时从 weiran_token Cookie 取令牌；两者都有时以 Bearer 为准")
    void readsTokenFromCookie() throws Exception {
        this.mockMvc
                .perform(get("/api/test/me").cookie(new Cookie(AuthCookies.TOKEN_COOKIE, "user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("zhangsan"));
        this.mockMvc
                .perform(get("/api/test/me")
                        .header("Authorization", "Bearer admin")
                        .cookie(new Cookie(AuthCookies.TOKEN_COOKIE, "user")))
                .andExpect(jsonPath("$.data").value("admin"));
        this.mockMvc
                .perform(get("/api/test/me").cookie(new Cookie(AuthCookies.TOKEN_COOKIE, "nope")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100));
    }

    @Test
    @DisplayName("Cookie 认证的写请求：缺 CSRF 头、头与 Cookie 不一致、CSRF 值不属于当前用户都返回 403 / 40302 且不执行业务")
    void rejectsCookieWriteWithoutValidCsrf() throws Exception {
        final Cookie token = new Cookie(AuthCookies.TOKEN_COOKIE, "user");
        this.mockMvc
                .perform(post("/api/test/write")
                        .cookie(token, new Cookie(AuthCookies.CSRF_COOKIE, WebLayerTest.USER_CSRF)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40302));
        this.mockMvc
                .perform(post("/api/test/write")
                        .cookie(token, new Cookie(AuthCookies.CSRF_COOKIE, WebLayerTest.USER_CSRF))
                        .header(AuthCookies.CSRF_HEADER, "2.other"))
                .andExpect(jsonPath("$.code").value(40302));
        this.mockMvc
                .perform(post("/api/test/write").cookie(token).header(AuthCookies.CSRF_HEADER, WebLayerTest.USER_CSRF))
                .andExpect(jsonPath("$.code").value(40302));
        this.mockMvc
                .perform(post("/api/test/write")
                        .cookie(token, new Cookie(AuthCookies.CSRF_COOKIE, "1.abc"))
                        .header(AuthCookies.CSRF_HEADER, "1.abc"))
                .andExpect(jsonPath("$.code").value(40302));
        assertThat(WebLayerTest.WRITES.get()).isZero();
        assertThat(CurrentUser.get()).isEmpty();
    }

    @Test
    @DisplayName("Cookie 认证的写请求带正确的 CSRF 头即放行")
    void acceptsCookieWriteWithCsrf() throws Exception {
        this.mockMvc
                .perform(post("/api/test/write")
                        .cookie(
                                new Cookie(AuthCookies.TOKEN_COOKIE, "user"),
                                new Cookie(AuthCookies.CSRF_COOKIE, WebLayerTest.USER_CSRF))
                        .header(AuthCookies.CSRF_HEADER, WebLayerTest.USER_CSRF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("zhangsan"));
        assertThat(WebLayerTest.WRITES.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("Bearer 认证的写请求、Cookie 认证的 GET、公开接口的写请求都不查 CSRF")
    void skipsCsrfWhereNotApplicable() throws Exception {
        this.mockMvc
                .perform(post("/api/test/write").header("Authorization", "Bearer user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        this.mockMvc
                .perform(get("/api/test/me").cookie(new Cookie(AuthCookies.TOKEN_COOKIE, "user")))
                .andExpect(jsonPath("$.code").value(0));
        this.mockMvc
                .perform(post("/api/test/body")
                        .cookie(new Cookie(AuthCookies.TOKEN_COOKIE, "user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\"}"))
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    @DisplayName("缺权限返回 403 / 40300，超级管理员直接放行")
    void checksPermission() throws Exception {
        this.mockMvc
                .perform(get("/api/test/perm").header("Authorization", "Bearer user"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));
        assertThat(CurrentUser.get()).isEmpty();
        this.mockMvc
                .perform(get("/api/test/perm").header("Authorization", "bearer admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("请求体校验失败返回 40000，message 形如「字段: 提示」")
    void reportsValidationError() throws Exception {
        this.mockMvc
                .perform(post("/api/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40000))
                .andExpect(jsonPath("$.message").value("name: 不能为空"));
        this.mockMvc
                .perform(post("/api/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{broken"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("请求体格式不正确"));
        this.mockMvc
                .perform(post("/api/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\"}"))
                .andExpect(jsonPath("$.data.name").value("x"));
    }

    @Test
    @DisplayName("业务异常、唯一键冲突、未知异常分别映射到约定错误码")
    void mapsExceptions() throws Exception {
        this.mockMvc
                .perform(get("/api/test/biz"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(CommonErrors.CONFLICT.code()))
                .andExpect(jsonPath("$.message").value("内置数据不可删除"));
        this.mockMvc
                .perform(get("/api/test/duplicate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(40900));
        this.mockMvc
                .perform(get("/api/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(50000))
                .andExpect(jsonPath("$.message").value("服务器内部错误"));
    }

    @Test
    @DisplayName("不存在的请求方法映射为 40000")
    void mapsMethodNotSupported() throws Exception {
        this.mockMvc
                .perform(post("/api/test/public"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("不支持的请求方法: POST"));
    }

    @Test
    @DisplayName("类上标 @SkipApiResponse：对象原样输出，不包统一响应")
    void skipsWrappingForAnnotatedClass() throws Exception {
        this.mockMvc
                .perform(get("/api-web/skip/object"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("ok"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("@SkipApiResponse 下返回 String 原样输出，不被序列化成 JSON 字符串")
    void skipsWrappingForStringReturnValue() throws Exception {
        this.mockMvc
                .perform(get("/api-web/skip/text"))
                .andExpect(status().isOk())
                .andExpect(content().string("pong"));
    }

    @Test
    @DisplayName("方法上标 @SkipApiResponse 或其组合注解只跳过该方法，同类其他方法照常包装")
    void skipsWrappingOnlyForAnnotatedMethod() throws Exception {
        this.mockMvc
                .perform(get("/api-web/mixed/skipped"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").doesNotExist());
        this.mockMvc
                .perform(get("/api-web/mixed/meta"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").doesNotExist());
        this.mockMvc
                .perform(get("/api-web/mixed/wrapped"))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.code").value(200));
    }
}
