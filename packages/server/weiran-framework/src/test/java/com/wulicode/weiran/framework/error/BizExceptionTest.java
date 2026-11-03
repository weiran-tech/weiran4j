package com.wulicode.weiran.framework.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.wulicode.weiran.framework.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BizExceptionTest {

    @Test
    @DisplayName("框架错误码按服务、资源、错误各两位编码，HTTP 状态独立定义")
    void codeHasSixDigitsAndFrameworkService() {
        for (final CommonErrors error : CommonErrors.values()) {
            assertThat(error.code()).isBetween(100_000, 999_999);
            assertThat(error.code() / 10_000).isEqualTo(10);
            assertThat(error.httpStatus()).isBetween(400, 599);
        }
    }

    @Test
    @DisplayName("快捷构造方法携带对应错误码与提示语")
    void factoryMethodsCarryErrorCode() {
        assertThat(BizException.notFound("用户不存在").getErrorCode()).isEqualTo(CommonErrors.NOT_FOUND);
        assertThat(BizException.conflict("x").getErrorCode()).isEqualTo(CommonErrors.CONFLICT);
        assertThat(BizException.badRequest("x").getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST);
        assertThat(BizException.duplicate("x").getMessage()).isEqualTo("x");
        assertThat(new BizException(CommonErrors.FORBIDDEN).getMessage()).isEqualTo("无权限访问");
        assertThat(new BizException(CommonErrors.INTERNAL_ERROR, new IllegalStateException()).getCause())
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("统一响应成功码为数字 0，失败时 data 为空")
    void apiResponseShape() {
        assertThat(ApiResponse.ok("x").code()).isZero();
        assertThat(ApiResponse.ok().data()).isNull();
        final ApiResponse<Void> fail = ApiResponse.fail(CommonErrors.UNAUTHORIZED);
        assertThat(fail.code()).isEqualTo(100101);
        assertThat(fail.message()).isEqualTo("登录已失效，请重新登录");
    }
}
