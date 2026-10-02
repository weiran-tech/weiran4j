package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.weiran.common.error.BizException;
import com.weiran.cqt.adapter.portal.PortalAccount;
import com.weiran.cqt.adapter.portal.PortalController;
import com.weiran.cqt.adapter.portal.PortalPublic;
import com.weiran.cqt.adapter.portal.PortalResult;
import com.weiran.cqt.domain.portal.PortalTokenCodec;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * 常青藤前台接口（{@code /api-web/**}）集成测试：响应包络、错误语义、前台令牌，以及站点配置接口。
 *
 * <p>下游测试：放在 {@code com.weiran.app} 包只为继承包级私有的 {@link IntegrationTestSupport}，不改任何上游文件。
 * 测试专用 Controller 用类上的 {@code @Import} 注册——{@code @SpringBootTest} 显式指定了启动类，嵌套的
 * {@code @TestConfiguration} 不会被发现。
 */
@Import(CqtWebIT.TestPortalController.class)
class CqtWebIT extends IntegrationTestSupport {

    private static final List<String> CONFIG_KEYS = List.of(
            "guanyuwomen",
            "user_agreement",
            "yinsixieyi",
            "about_us",
            "dizhi",
            "shouji",
            "weixin",
            "youxiang",
            "gongsijieshao",
            "hezuohuoban",
            "dasaijieshao",
            "mianzexieyi",
            "shouhoufuwu",
            "shangwuhezuo",
            "gongzuoshijian",
            "dasaizhangcheng",
            "gongzhonghao",
            "certificate_visibility",
            "sheng_certificate_visibility",
            "guo_certificate_visibility",
            "teacher_org_certificate_competition_id",
            "shouyeimage");

    @Autowired
    PortalTokenCodec portalTokenCodec;

    @BeforeEach
    void resetSettings() {
        this.jdbc.update("DELETE FROM cqt_setting");
        this.jdbc.update(
                "INSERT INTO cqt_setting (ident, name, contents) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)",
                7,
                "地址",
                "<p>北京市 <b>东城区</b></p> ",
                23,
                "公众号",
                "/uploads/qr.png",
                8,
                "手机",
                null,
                101,
                "超出范围",
                "不应读取");
    }

    @Test
    @DisplayName("getconfig 免登录：HTTP 200 + code 200，恰好 22 个键，去标签、缺行为 null、公众号为数组")
    void getConfig() {
        final ResponseEntity<JsonNode> response = this.get("/api-web/product/getconfig", null);

        CqtWebIT.assertPortalOk(response);
        final JsonNode data = IntegrationTestSupport.data(response);
        final List<String> keys = new ArrayList<>();
        data.fieldNames().forEachRemaining(keys::add);
        assertThat(keys).containsExactlyInAnyOrderElementsOf(CqtWebIT.CONFIG_KEYS);
        assertThat(data.path("dizhi").asText()).isEqualTo("北京市 东城区");
        assertThat(data.path("weixin").isNull()).isTrue();
        assertThat(data.path("shouji").isNull()).isTrue();
        assertThat(data.path("gongzhonghao").isArray()).isTrue();
        assertThat(data.path("gongzhonghao").get(0).asText()).isEqualTo("/uploads/qr.png");
    }

    @Test
    @DisplayName("cqt_setting 的列与原库 sc_setting 一致")
    void settingTableMatchesLegacyColumns() {
        final List<String> columns = this.jdbc.queryForList(
                "SELECT column_name FROM information_schema.columns "
                        + "WHERE table_schema = DATABASE() AND table_name = 'cqt_setting' ORDER BY ordinal_position",
                String.class);

        assertThat(columns)
                .containsExactly("id", "ident", "name", "contents", "created_at", "updated_at", "deleted_at", "key");
    }

    @Test
    @DisplayName("需登录接口：无令牌 / 无效令牌 → HTTP 200 + code 401 与对应提示语；有效令牌 → 取得账号 ID")
    void requiresPortalToken() {
        CqtWebIT.assertPortalError(this.get("/api-web/__test/me", null), 401, "请求参数缺token");
        CqtWebIT.assertPortalError(this.get("/api-web/__test/me", "not-a-jwt"), 401, "登录失效,请重新登录");

        final ResponseEntity<JsonNode> response = this.get("/api-web/__test/me", this.portalTokenCodec.issue(42L));
        CqtWebIT.assertPortalOk(response);
        assertThat(IntegrationTestSupport.data(response).asLong()).isEqualTo(42L);
    }

    @Test
    @DisplayName("公开接口：无令牌可访问，带有效令牌时仍取得账号 ID")
    void publicEndpointResolvesOptionalAccount() {
        final ResponseEntity<JsonNode> anonymous = this.get("/api-web/__test/public-me", null);
        CqtWebIT.assertPortalOk(anonymous);
        assertThat(IntegrationTestSupport.data(anonymous).asLong()).isEqualTo(-1L);

        final ResponseEntity<JsonNode> signedIn =
                this.get("/api-web/__test/public-me", this.portalTokenCodec.issue(7L));
        assertThat(IntegrationTestSupport.data(signedIn).asLong()).isEqualTo(7L);
    }

    @Test
    @DisplayName("前后台令牌互不通用")
    void portalAndAdminTokensAreSeparate() {
        final ResponseEntity<JsonNode> portalOnAdmin = this.get("/api/auth/me", this.portalTokenCodec.issue(42L));
        IntegrationTestSupport.assertError(portalOnAdmin, HttpStatus.UNAUTHORIZED, 40100);

        CqtWebIT.assertPortalError(this.get("/api-web/__test/me", this.adminToken()), 401, "登录失效,请重新登录");
    }

    @Test
    @DisplayName("后台接口错误语义不变：无令牌 → HTTP 401 + 40100")
    void adminErrorsUnchanged() {
        IntegrationTestSupport.assertError(this.get("/api/auth/me", null), HttpStatus.UNAUTHORIZED, 40100);
    }

    @Test
    @DisplayName("业务异常折成三位码；参数缺失与类型不匹配为 400；未预期异常为 500 且不泄露细节")
    void errorSemantics() {
        CqtWebIT.assertPortalError(this.get("/api-web/__test/not-found", null), 404, "资源不存在");

        final ResponseEntity<JsonNode> missing = this.get("/api-web/__test/required", null);
        CqtWebIT.assertPortalError(missing, 400, "page: 不能为空");
        final ResponseEntity<JsonNode> mismatch = this.get("/api-web/__test/required?page=abc", null);
        CqtWebIT.assertPortalError(mismatch, 400, "page: 参数类型不正确");

        final ResponseEntity<JsonNode> boom = this.get("/api-web/__test/boom", null);
        CqtWebIT.assertPortalError(boom, 500, "服务器内部错误");
        assertThat(IntegrationTestSupport.body(boom).toString()).doesNotContain("internal-detail");
    }

    private static void assertPortalOk(final ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode())
                .as(String.valueOf(response.getBody()))
                .isEqualTo(HttpStatus.OK);
        final JsonNode body = IntegrationTestSupport.body(response);
        assertThat(body.path("code").asInt()).as(body.toString()).isEqualTo(200);
        assertThat(body.path("message").asText()).isEqualTo("成功");
    }

    private static void assertPortalError(
            final ResponseEntity<JsonNode> response, final int code, final String message) {
        assertThat(response.getStatusCode())
                .as(String.valueOf(response.getBody()))
                .isEqualTo(HttpStatus.OK);
        final JsonNode body = IntegrationTestSupport.body(response);
        assertThat(body.path("code").asInt()).as(body.toString()).isEqualTo(code);
        assertThat(body.path("message").asText()).isEqualTo(message);
        assertThat(body.path("data").isNull()).isTrue();
    }

    /** 只存在于测试 classpath 的前台接口，用来覆盖无法用真实业务接口触发的分支。 */
    @PortalController
    @RequestMapping("/api-web/__test")
    static class TestPortalController {

        @GetMapping("/me")
        PortalResult<Long> me() {
            return PortalResult.ok(PortalAccount.current().orElseThrow());
        }

        @PortalPublic
        @GetMapping("/public-me")
        PortalResult<Long> publicMe() {
            return PortalResult.ok(PortalAccount.current().orElse(-1L));
        }

        @PortalPublic
        @GetMapping("/not-found")
        PortalResult<Void> notFound() {
            throw BizException.notFound("资源不存在");
        }

        @PortalPublic
        @GetMapping("/required")
        PortalResult<Integer> required(@RequestParam final int page) {
            return PortalResult.ok(page);
        }

        @PortalPublic
        @GetMapping("/boom")
        PortalResult<Void> boom() {
            throw new IllegalStateException("internal-detail");
        }
    }
}
