package com.weiran.framework.web;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.error.ErrorCode;
import com.weiran.common.response.ApiResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 全局异常处理：所有异常都转换成 {@link ApiResponse}，HTTP 状态码与错误码前三位一致。
 *
 * <p>Spring MVC 自身的异常（参数校验、请求体不可读、404、405 等）由父类
 * {@link ResponseEntityExceptionHandler} 分派，本类只在 {@link #handleExceptionInternal} 里统一改写响应体，
 * 避免逐个异常写处理方法时漏掉某一种而退回 Spring 默认的 ProblemDetail 格式。
 *
 * <p>不限定 {@code basePackages}：404 这类异常发生时没有 Controller，受限的 advice 接不到。
 */
@Slf4j
@Order(Ordered.LOWEST_PRECEDENCE)
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /** 业务异常。 */
    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Void>> handleBiz(final BizException ex) {
        final ErrorCode errorCode = ex.getErrorCode();
        if (errorCode.httpStatus() >= 500) {
            GlobalExceptionHandler.log.error("业务异常: {}", ex.getMessage(), ex);
        }
        return GlobalExceptionHandler.respond(errorCode, GlobalExceptionHandler.messageOrDefault(ex, errorCode));
    }

    /** 方法级校验（{@code @Validated} 类上的参数约束）。 */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(final ConstraintViolationException ex) {
        final String message = ex.getConstraintViolations().stream()
                .findFirst()
                .map(GlobalExceptionHandler::describe)
                .orElse(CommonErrors.BAD_REQUEST.message());
        return GlobalExceptionHandler.respond(CommonErrors.BAD_REQUEST, message);
    }

    /** 唯一键冲突兜底：应用层通常会先查重给出更具体的提示，并发写入时才会走到这里。 */
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateKey(final DuplicateKeyException ex) {
        GlobalExceptionHandler.log.warn("唯一键冲突: {}", ex.getMostSpecificCause().getMessage());
        return GlobalExceptionHandler.respond(CommonErrors.DUPLICATE_KEY, CommonErrors.DUPLICATE_KEY.message());
    }

    /** 其它未预期异常：记 error 日志，响应里不暴露任何细节。 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(final Exception ex) {
        GlobalExceptionHandler.log.error("未处理的异常", ex);
        return GlobalExceptionHandler.respond(CommonErrors.INTERNAL_ERROR, CommonErrors.INTERNAL_ERROR.message());
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            final Exception ex,
            final @Nullable Object body,
            final HttpHeaders headers,
            final HttpStatusCode statusCode,
            final WebRequest request) {
        final ErrorCode errorCode;
        if (statusCode.value() == 404) {
            errorCode = CommonErrors.NOT_FOUND;
        } else if (statusCode.is4xxClientError()) {
            errorCode = CommonErrors.BAD_REQUEST;
        } else {
            errorCode = CommonErrors.INTERNAL_ERROR;
            GlobalExceptionHandler.log.error("Spring MVC 内部异常", ex);
        }
        final ApiResponse<Void> response = ApiResponse.fail(errorCode, GlobalExceptionHandler.describe(ex, errorCode));
        return ResponseEntity.status(errorCode.httpStatus()).headers(headers).body(response);
    }

    private static ResponseEntity<ApiResponse<Void>> respond(final ErrorCode errorCode, final String message) {
        return ResponseEntity.status(errorCode.httpStatus()).body(ApiResponse.fail(errorCode, message));
    }

    private static String messageOrDefault(final Exception ex, final ErrorCode errorCode) {
        final String message = ex.getMessage();
        return message == null || message.isBlank() ? errorCode.message() : message;
    }

    /** 把 Spring MVC 异常翻译成面向用户的提示语。 */
    private static String describe(final Exception ex, final ErrorCode errorCode) {
        if (ex instanceof final BindException bind) {
            // MethodArgumentNotValidException 是 BindException 的子类：取第一条字段错误，形如「username: 不能为空」。
            final FieldError fieldError = bind.getFieldError();
            if (fieldError != null) {
                return fieldError.getField() + ": " + GlobalExceptionHandler.text(fieldError);
            }
            return bind.getAllErrors().stream()
                    .findFirst()
                    .map(GlobalExceptionHandler::text)
                    .orElse(errorCode.message());
        }
        if (ex instanceof final HandlerMethodValidationException validation) {
            return validation.getParameterValidationResults().stream()
                    .flatMap(result -> {
                        final String name = result.getMethodParameter().getParameterName();
                        return result.getResolvableErrors().stream()
                                .map(error -> (name == null ? "" : name + ": ") + GlobalExceptionHandler.text(error));
                    })
                    .findFirst()
                    .orElse(errorCode.message());
        }
        if (ex instanceof final MissingServletRequestParameterException missing) {
            return missing.getParameterName() + ": 不能为空";
        }
        if (ex instanceof final MethodArgumentTypeMismatchException mismatch) {
            return mismatch.getName() + ": 参数类型不正确";
        }
        if (ex instanceof HttpMessageNotReadableException) {
            return "请求体格式不正确";
        }
        if (ex instanceof NoResourceFoundException) {
            return "接口不存在";
        }
        if (ex instanceof final HttpRequestMethodNotSupportedException method) {
            return "不支持的请求方法: " + method.getMethod();
        }
        return errorCode.message();
    }

    private static String text(final MessageSourceResolvable error) {
        final String message = error.getDefaultMessage();
        return message == null ? CommonErrors.BAD_REQUEST.message() : message;
    }

    private static String describe(final ConstraintViolation<?> violation) {
        String field = "";
        for (final Path.Node node : violation.getPropertyPath()) {
            field = node.getName() == null ? field : node.getName();
        }
        return field.isEmpty() ? violation.getMessage() : field + ": " + violation.getMessage();
    }
}
