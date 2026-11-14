package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.wulicode.weiran.system.adapter.web.request.AssignMenusRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateMenuRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateProfileRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateRoleRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateUserAccountFieldRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateUserRequest;
import io.swagger.v3.core.converter.ModelConverters;
import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EditVersionSchemaTest {
    @Test
    @DisplayName("编辑请求生成的 OpenAPI schema 均将 version 声明为必填")
    void generatedSchemasRequireVersion() {
        for (final Class<?> type : List.of(
                UpdateUserRequest.class,
                UpdateUserAccountFieldRequest.class,
                UpdateRoleRequest.class,
                UpdateMenuRequest.class,
                AssignMenusRequest.class,
                UpdateProfileRequest.class)) {
            final var schema = Objects.requireNonNull(
                    ModelConverters.getInstance().readAll(type).get(type.getSimpleName()));
            assertThat(schema.getRequired().contains("version"))
                    .as(type.getSimpleName())
                    .isTrue();
        }
    }
}
