package com.weiran.framework.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.common.response.ApiResponse;
import org.jspecify.annotations.Nullable;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * 把本仓 Controller 的返回值统一包成 {@link ApiResponse}。
 *
 * <p>三条边界：
 * <ul>
 *   <li>只作用于 {@code com.weiran} 包下的 Controller（{@code basePackages}），springdoc 的
 *       {@code /v3/api-docs} 等第三方端点保持原样；</li>
 *   <li>已经是 {@link ApiResponse} 的不重复包（全局异常处理器的返回值、显式返回 {@code ApiResponse.ok()} 的写操作）；</li>
 *   <li>返回 {@code String} 时 Spring 选中的是 {@link StringHttpMessageConverter}，它只能写字符串，
 *       直接塞对象会 ClassCastException，因此这里先序列化成 JSON 字符串并改写 Content-Type。</li>
 * </ul>
 *
 * <p>写操作无数据时请显式返回 {@code ApiResponse.ok()}：{@code void} 方法不会走到这里。
 */
@RestControllerAdvice(basePackages = "com.weiran")
public class ApiResponseBodyAdvice implements ResponseBodyAdvice<Object> {

    private final ObjectMapper objectMapper;

    /** 构造包装器；String 返回值需要用同一个 ObjectMapper 手工序列化。 */
    public ApiResponseBodyAdvice(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean supports(
            final MethodParameter returnType, final Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public @Nullable Object beforeBodyWrite(
            final @Nullable Object body,
            final MethodParameter returnType,
            final MediaType selectedContentType,
            final Class<? extends HttpMessageConverter<?>> selectedConverterType,
            final ServerHttpRequest request,
            final ServerHttpResponse response) {
        if (body instanceof ApiResponse<?>) {
            return body;
        }
        final ApiResponse<?> wrapped = ApiResponse.ok(body);
        if (StringHttpMessageConverter.class.isAssignableFrom(selectedConverterType)) {
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            try {
                return this.objectMapper.writeValueAsString(wrapped);
            } catch (final JsonProcessingException ex) {
                throw new IllegalStateException("统一响应序列化失败", ex);
            }
        }
        return wrapped;
    }
}
