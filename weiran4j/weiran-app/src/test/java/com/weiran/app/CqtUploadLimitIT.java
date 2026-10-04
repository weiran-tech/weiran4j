package com.weiran.app;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** 上传大小上限（单独上下文，把上限调到 10 字节复现「超过 1GB」的处理路径）。 */
@TestPropertySource(properties = "spring.servlet.multipart.max-file-size=10B")
class CqtUploadLimitIT extends CqtIntegrationTestSupport {

    @Test
    @DisplayName("超过上限：HTTP 200 + code 400「文件大小不能超过 1GB」")
    void rejectsOversizedFile() {
        final String token = this.portalToken(this.registerPersonal(), CqtIntegrationTestSupport.PASSWORD);
        final MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new ByteArrayResource(new byte[100]) {
            @Override
            public String getFilename() {
                return "big.zip";
            }
        });
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);

        final ResponseEntity<JsonNode> response = this.rest.exchange(
                "/api-web/local-files/upload", HttpMethod.POST, new HttpEntity<>(form, headers), JsonNode.class);

        CqtUploadLimitIT.assertPortalError(response, 400, "文件大小不能超过 1GB");
    }
}
