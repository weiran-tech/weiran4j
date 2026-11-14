package com.wulicode.weiran.framework.autoconfigure;

import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.framework.web.ApiResponsePolicy;
import com.wulicode.weiran.framework.web.ErrorResponse;
import io.swagger.v3.oas.models.media.ComposedSchema;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import java.util.Collections;
import java.util.List;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.core.ResolvableType;
import org.springframework.http.ResponseEntity;

/** 可选文档适配，不把 springdoc 带入领域层或无文档应用。 */
@AutoConfiguration
@ConditionalOnClass(name = "org.springdoc.core.customizers.OperationCustomizer")
public class WeiranOpenApiAutoConfiguration {
    /** 保留业务 schema，只在响应层添加运行时包络。 */
    @Bean
    @SuppressWarnings({"rawtypes", "unchecked"}) // Swagger 模型 API 的 Schema 泛型不能表达任意业务 schema。
    OperationCustomizer weiranResponseSchemas() {
        return (operation, handler) -> {
            if (!ApiResponsePolicy.applies(handler.getBeanType(), handler.getMethod())) {
                return operation;
            }
            ResolvableType type = ResolvableType.forMethodReturnType(handler.getMethod(), handler.getBeanType());
            if (ResponseEntity.class.isAssignableFrom(type.toClass())) {
                type = type.getGeneric(0);
            }
            final Class<?> bodyType = type.toClass();
            final boolean emptyEnvelope = ApiResponse.class.isAssignableFrom(bodyType)
                    && type.getGeneric(0).resolve() == Void.class;
            if (operation.getResponses() == null) {
                return operation;
            }
            final boolean alreadyWrapped = ApiResponse.class.isAssignableFrom(bodyType);
            if (bodyType != void.class && bodyType != Void.class && bodyType != ErrorResponse.class) {
                operation.getResponses().forEach((status, response) -> {
                    if (!status.startsWith("2")
                            || "204".equals(status)
                            || "205".equals(status)
                            || response.getContent() == null) {
                        return;
                    }
                    response.getContent().forEach((media, content) -> {
                        if (!media.contains("json") && !"*/*".equals(media) && bodyType != String.class) {
                            return;
                        }
                        final Schema original = content.getSchema();
                        final ObjectSchema envelope = new ObjectSchema();
                        envelope.addProperty("code", new IntegerSchema()._enum(List.of(0)));
                        if (alreadyWrapped) {
                            if (emptyEnvelope) {
                                envelope.addProperty(
                                        "data",
                                        new Schema<>()
                                                .type("object")
                                                .nullable(true)
                                                ._enum(Collections.singletonList(null)));
                            }
                            content.setSchema(
                                    new ComposedSchema().addAllOfItem(original).addAllOfItem(envelope));
                        } else {
                            envelope.addProperty("message", new StringSchema());
                            envelope.addProperty("data", original == null ? new Schema<>().nullable(true) : original);
                            envelope.setRequired(List.of("code", "message", "data"));
                            content.setSchema(envelope);
                        }
                    });
                    if ((bodyType == String.class || response.getContent().containsKey("*/*"))
                            && !response.getContent().containsKey("application/json")) {
                        final io.swagger.v3.oas.models.media.MediaType schema =
                                response.getContent().values().iterator().next();
                        response.setContent(new Content().addMediaType("application/json", schema));
                    }
                });
            }
            final ObjectSchema error = new ObjectSchema();
            error.addProperty("code", new IntegerSchema());
            error.addProperty("message", new StringSchema());
            error.addProperty(
                    "data", new Schema<>().type("object").nullable(true)._enum(Collections.singletonList(null)));
            error.addProperty("requestId", new StringSchema());
            error.setRequired(List.of("code", "message", "data", "requestId"));
            for (final String status : List.of("400", "401", "403", "409", "500", "503")) {
                operation
                        .getResponses()
                        .putIfAbsent(
                                status,
                                new io.swagger.v3.oas.models.responses.ApiResponse()
                                        .description("统一失败响应；错误码与 HTTP 状态独立定义")
                                        .content(new Content()
                                                .addMediaType("application/json", new MediaType().schema(error))));
            }
            return operation;
        };
    }
}
