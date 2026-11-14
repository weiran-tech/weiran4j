package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.framework.web.SkipApiResponse;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 文档由真实 Springdoc 生成，响应由真实 Advice 产生。 */
@Import(OpenApiResponseIT.Examples.class)
@TestPropertySource(properties = {"springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=false"})
class OpenApiResponseIT extends IntegrationTestSupport {
    @Retention(RetentionPolicy.RUNTIME)
    @SkipApiResponse
    @interface Raw {}

    @RestController
    static class Examples {
        @GetMapping("/api-backend/n/system/contract/object")
        public Map<String, String> object() {
            return Map.of("name", "sample");
        }

        @GetMapping("/api-backend/n/system/contract/list")
        public List<String> list() {
            return List.of("sample");
        }

        @GetMapping("/api-backend/n/system/contract/page")
        public PageResult<String> page() {
            return new PageResult<>(List.of("sample"), 1, 1, 20);
        }

        @GetMapping("/api-backend/n/system/contract/string")
        public String string() {
            return "sample";
        }

        @GetMapping("/api-backend/n/system/contract/empty")
        public ApiResponse<Void> empty() {
            return ApiResponse.ok();
        }

        @GetMapping("/api-backend/n/system/contract/wrapped")
        public ApiResponse<List<String>> wrapped() {
            return ApiResponse.ok(List.of("sample"));
        }

        @Raw
        @GetMapping("/api-backend/n/system/contract/raw")
        public Map<String, String> raw() {
            return Map.of("name", "raw");
        }

        @GetMapping("/api-backend/n/system/contract/failure")
        public String failure() {
            throw BizException.badRequest("测试校验错误");
        }
    }

    @Test
    @DisplayName("真实 OpenAPI 与 HTTP 的对象、列表、字符串、显式包络及原始响应一致")
    void schemasMatchRuntime() {
        final JsonNode document = this.rest.getForObject("/v3/api-docs", JsonNode.class);
        assertThat(document).isNotNull();
        for (final String kind : List.of("object", "list", "page", "string", "empty", "wrapped")) {
            final String url = "/api-backend/n/system/contract/" + kind;
            final JsonNode actual = this.rest.getForObject(url, JsonNode.class);
            assertThat(actual).isNotNull();
            assertThat(actual.path("code").isInt()).isTrue();
            assertThat(actual.path("code").asInt()).isZero();
            assertThat(actual.has("requestId")).isFalse();
            final JsonNode schema = this.schema(document, url, "200");
            assertThat(this.property(document, schema, "code").path("type").asText())
                    .as(kind + " " + schema)
                    .isEqualTo("integer");
            assertThat(this.property(document, schema, "data").isMissingNode()).isFalse();
            if ("list".equals(kind) || "wrapped".equals(kind)) {
                assertThat(this.property(document, schema, "data").path("type").asText())
                        .isEqualTo("array");
                assertThat(actual.path("data").get(0).asText()).isEqualTo("sample");
            }
            if ("page".equals(kind)) {
                assertThat(this.property(document, this.property(document, schema, "data"), "list")
                                .path("type")
                                .asText())
                        .isEqualTo("array");
                assertThat(actual.path("data").path("total").asInt()).isEqualTo(1);
            }
            if ("string".equals(kind)) {
                assertThat(this.property(document, schema, "data").path("type").asText())
                        .isEqualTo("string");
                assertThat(actual.path("data").asText()).isEqualTo("sample");
            }
            if ("empty".equals(kind)) {
                assertThat(actual.path("data").isNull()).isTrue();
            }
        }
        final String raw = "/api-backend/n/system/contract/raw";
        assertThat(this.schema(document, raw, "200").has("data")).isFalse();
        assertThat(this.rest.getForObject(raw, JsonNode.class).has("code")).isFalse();
        final JsonNode failure = this.schema(document, "/api-backend/n/system/contract/object", "400");
        assertThat(this.property(document, failure, "requestId").path("type").asText())
                .isEqualTo("string");
        final var response = this.rest.getForEntity("/api-backend/n/system/contract/failure", JsonNode.class);
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(IntegrationTestSupport.body(response).path("requestId").asText())
                .isEqualTo(response.getHeaders().getFirst("X-Request-Id"));
    }

    private JsonNode schema(final JsonNode document, final String url, final String status) {
        return this.resolve(
                document,
                document.path("paths")
                        .path(url)
                        .path("get")
                        .path("responses")
                        .path(status)
                        .path("content")
                        .path("application/json")
                        .path("schema"));
    }

    private JsonNode resolve(final JsonNode document, final JsonNode schema) {
        return schema.has("$ref") ? document.at(schema.path("$ref").asText().substring(1)) : schema;
    }

    private JsonNode property(final JsonNode document, final JsonNode schema, final String key) {
        final JsonNode resolved = this.resolve(document, schema);
        final JsonNode found = resolved.path("properties").path(key);
        if (!found.isMissingNode()) {
            return this.resolve(document, found);
        }
        for (final JsonNode item : resolved.path("allOf")) {
            final JsonNode nested = this.property(document, item, key);
            if (!nested.isMissingNode()) {
                return nested;
            }
        }
        return found;
    }
}
