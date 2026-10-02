package com.weiran.cqt.adapter.portal;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.response.ApiResponse;
import com.weiran.framework.web.GlobalExceptionHandler;
import com.weiran.framework.web.SkipApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/**
 * 前台接口的异常出口：HTTP 恒为 200，body {@code code} 取五位错误码的前三位（如 40100 → 401）。
 *
 * <p>只作用于标了 {@link PortalController} 的 Controller，优先级高于框架的 {@link GlobalExceptionHandler}。
 * 错误码与提示语的判定**委托给框架处理器**（业务异常、参数校验、请求格式、未预期异常的口径与后台一致，
 * 包括未预期异常不暴露细节），这里只把它的结果改写成前台格式——HTTP 状态不随错误码变化是 uniapp 的约定
 * （非 2xx 一律弹窗），见 design 宪法对照 CP-11。
 *
 * <p>本类自身标 {@link SkipApiResponse}：异常处理方法的返回值同样经过框架的统一包装，不标会被再包一层 {@code {code:0}}。
 */
@RestControllerAdvice(annotations = PortalController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
@SkipApiResponse
public class PortalExceptionAdvice {

    private final GlobalExceptionHandler frameworkHandler;

    /** 构造处理器；错误判定委托给框架的全局异常处理器。 */
    public PortalExceptionAdvice(final GlobalExceptionHandler frameworkHandler) {
        this.frameworkHandler = frameworkHandler;
    }

    /** 全部异常：先按框架口径翻译，再改写成前台格式。 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<PortalResult<Void>> handle(final Exception ex, final WebRequest request) {
        final ResponseEntity<?> translated = this.translate(ex, request);
        final PortalResult<Void> body = translated.getBody() instanceof final ApiResponse<?> response
                ? PortalResult.fail(response.code() / 100, response.message())
                : PortalResult.fail(CommonErrors.INTERNAL_ERROR.httpStatus(), CommonErrors.INTERNAL_ERROR.message());
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> translate(final Exception ex, final WebRequest request) {
        if (ex instanceof final BizException biz) {
            return this.frameworkHandler.handleBiz(biz);
        }
        if (ex instanceof final ConstraintViolationException violation) {
            return this.frameworkHandler.handleConstraintViolation(violation);
        }
        if (ex instanceof final DuplicateKeyException duplicate) {
            return this.frameworkHandler.handleDuplicateKey(duplicate);
        }
        try {
            // Spring MVC 自身的异常（参数缺失、类型不匹配、请求体不可读……）；不认识的类型会原样抛回。
            final ResponseEntity<Object> handled = this.frameworkHandler.handleException(ex, request);
            if (handled != null) {
                return handled;
            }
        } catch (final Exception unknown) {
            // 非 Spring MVC 异常，走下面的未预期分支。
        }
        return this.frameworkHandler.handleUnexpected(ex);
    }
}
