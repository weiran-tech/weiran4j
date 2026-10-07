package com.weiran.system.infrastructure.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.stream.Collectors;

/** 提供方共用的 HTTP + JSON 小工具（JDK HttpClient，不引入依赖）。 */
final class HttpJson {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private static final int HTTP_OK_MIN = 200;

    private static final int HTTP_OK_MAX = 299;

    private final HttpClient client;

    private final ObjectMapper objectMapper;

    HttpJson(final HttpClient client, final ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    /** GET 并解析 JSON；非 2xx 抛 {@link IOException}（消息只含状态码，不含响应体）。 */
    JsonNode get(final String url) throws IOException, InterruptedException {
        return this.send(HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .GET()
                .build());
    }

    /** POST 表单并解析 JSON。 */
    JsonNode postForm(final String url, final Map<String, String> form) throws IOException, InterruptedException {
        final String body = form.entrySet().stream()
                .map(e -> HttpJson.encode(e.getKey()) + "=" + HttpJson.encode(e.getValue()))
                .collect(Collectors.joining("&"));
        return this.send(HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build());
    }

    ObjectMapper objectMapper() {
        return this.objectMapper;
    }

    static String encode(final String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private JsonNode send(final HttpRequest request) throws IOException, InterruptedException {
        final HttpResponse<String> response = this.client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < HTTP_OK_MIN || response.statusCode() > HTTP_OK_MAX) {
            throw new IOException("HTTP " + response.statusCode() + " " + request.method() + " "
                    + request.uri().getHost());
        }
        return this.objectMapper.readTree(response.body());
    }
}
