package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** 前台文件上传（测试配置为本地存储，经 {@code /uploads/**} 取回）。 */
class CqtFileUploadIT extends CqtIntegrationTestSupport {

    /** 以 multipart 上传；{@code fileName} 为 null 时不带文件字段。 */
    ResponseEntity<JsonNode> upload(
            final @Nullable String token, final @Nullable String fileName, final byte[] content) {
        final MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        if (fileName != null) {
            form.add("file", new ByteArrayResource(content) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            });
        }
        form.add("original_name", "ignored");
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return this.rest.exchange(
                "/api-web/local-files/upload", HttpMethod.POST, new HttpEntity<>(form, headers), JsonNode.class);
    }

    @Test
    @DisplayName("登录上传成功：返回 url/name/path/size，对象名含账号 ID，按 url 取回内容一致")
    void uploadsAndServes() {
        final String phone = this.registerPersonal();
        final long accountId = this.accountId(phone);
        final byte[] content = "zip-content".getBytes(StandardCharsets.UTF_8);

        final ResponseEntity<JsonNode> response =
                this.upload(this.portalToken(phone, CqtIntegrationTestSupport.PASSWORD), "作品.ZIP", content);

        CqtFileUploadIT.assertPortalOk(response);
        final JsonNode data = IntegrationTestSupport.data(response);
        assertThat(data.path("name").asText()).isEqualTo("作品.ZIP");
        assertThat(data.path("size").asLong()).isEqualTo(content.length);
        assertThat(data.path("path").asText())
                .startsWith("cqt/user_files/" + accountId + "/")
                .endsWith(".zip");
        assertThat(data.path("url").asText())
                .isEqualTo("/uploads/" + data.path("path").asText());

        final ResponseEntity<byte[]> served =
                this.rest.getForEntity(data.path("url").asText(), byte[].class);
        assertThat(served.getBody()).isEqualTo(content);
    }

    @Test
    @DisplayName("未登录 401；缺文件「请选择文件」；不支持的类型")
    void rejects() {
        CqtFileUploadIT.assertPortalError(this.upload(null, "a.zip", new byte[] {1}), 401, "请求参数缺token");

        final String token = this.portalToken(this.registerPersonal(), CqtIntegrationTestSupport.PASSWORD);
        CqtFileUploadIT.assertPortalError(this.upload(token, null, new byte[0]), 400, "请选择文件");
        CqtFileUploadIT.assertPortalError(this.upload(token, "virus.exe", new byte[] {1}), 400, "不支持的文件类型");
    }
}
