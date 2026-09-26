package com.weiran.framework.log;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.response.ApiResponse;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import com.weiran.framework.web.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * {@link OperationLog} 切面：在 Controller 方法前后采集审计信息并交给 {@link OperationLogRecorder}。
 *
 * <p>请求体取自标了 {@link RequestBody} 的参数（已经被 Spring 反序列化成对象），重新序列化后脱敏——
 * 原始输入流此时已被读完，无法再读。参数绑定/校验失败发生在方法调用之前，不会产生操作日志。
 *
 * <p>任何采集或记录环节的异常都只记 warn，绝不影响业务结果。
 */
@Slf4j
@Aspect
public class OperationLogAspect {

    private static final int MAX_TEXT_LENGTH = 512;

    private final ObjectProvider<OperationLogRecorder> recorders;

    private final ObjectMapper objectMapper;

    private final Clock clock;

    /** 构造切面；没有 {@link OperationLogRecorder} 时直接放行。 */
    public OperationLogAspect(
            final ObjectProvider<OperationLogRecorder> recorders, final ObjectMapper objectMapper, final Clock clock) {
        this.recorders = recorders;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /** 环绕记录。 */
    @Around("@annotation(operationLog)")
    public @Nullable Object around(final ProceedingJoinPoint joinPoint, final OperationLog operationLog)
            throws Throwable {
        final OperationLogRecorder recorder = this.recorders.getIfAvailable();
        if (recorder == null) {
            return joinPoint.proceed();
        }
        final LocalDateTime startedAt = LocalDateTime.now(this.clock);
        final long start = System.nanoTime();
        // 先取当前用户：登出等操作执行完后上下文可能已不再可信。
        final Optional<LoginUser> user = CurrentUser.get();
        try {
            final Object result = joinPoint.proceed();
            this.record(recorder, joinPoint, operationLog, user, startedAt, start, null);
            return result;
        } catch (final Throwable ex) {
            this.record(recorder, joinPoint, operationLog, user, startedAt, start, ex);
            throw ex;
        }
    }

    private void record(
            final OperationLogRecorder recorder,
            final ProceedingJoinPoint joinPoint,
            final OperationLog operationLog,
            final Optional<LoginUser> user,
            final LocalDateTime startedAt,
            final long start,
            final @Nullable Throwable failure) {
        try {
            final long durationMs = (System.nanoTime() - start) / 1_000_000L;
            final HttpServletRequest request = OperationLogAspect.currentRequest();
            final int responseCode;
            final String errorMessage;
            if (failure == null) {
                responseCode = ApiResponse.SUCCESS_CODE;
                errorMessage = null;
            } else if (failure instanceof final BizException biz) {
                responseCode = biz.getErrorCode().code();
                errorMessage = SensitiveDataMasker.truncate(biz.getMessage(), OperationLogAspect.MAX_TEXT_LENGTH);
            } else {
                responseCode = CommonErrors.INTERNAL_ERROR.code();
                errorMessage = CommonErrors.INTERNAL_ERROR.message();
            }
            final OperationLogEvent event = new OperationLogEvent(
                    user.map(LoginUser::id).orElse(null),
                    user.map(LoginUser::username).orElse(null),
                    operationLog.module(),
                    operationLog.description(),
                    request == null ? "" : request.getMethod(),
                    request == null ? "" : request.getRequestURI(),
                    this.requestBody(joinPoint),
                    responseCode,
                    failure == null,
                    errorMessage,
                    durationMs,
                    request == null ? "" : ClientIpResolver.resolve(request),
                    OperationLogAspect.userAgent(request),
                    startedAt);
            recorder.record(event);
        } catch (final RuntimeException ex) {
            OperationLogAspect.log.warn("操作日志采集失败: {}", ex.toString());
        }
    }

    private @Nullable String requestBody(final ProceedingJoinPoint joinPoint) {
        if (!(joinPoint.getSignature() instanceof final MethodSignature signature)) {
            return null;
        }
        final Method method = signature.getMethod();
        final Annotation[][] annotations = method.getParameterAnnotations();
        final Object[] args = joinPoint.getArgs();
        for (int i = 0; i < annotations.length && i < args.length; i++) {
            for (final Annotation annotation : annotations[i]) {
                if (annotation instanceof RequestBody && args[i] != null) {
                    final JsonNode tree = this.objectMapper.valueToTree(args[i]);
                    SensitiveDataMasker.mask(tree);
                    return SensitiveDataMasker.truncate(tree.toString(), SensitiveDataMasker.MAX_BODY_LENGTH);
                }
            }
        }
        return null;
    }

    private static @Nullable HttpServletRequest currentRequest() {
        final RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        return attributes instanceof final ServletRequestAttributes servlet ? servlet.getRequest() : null;
    }

    private static String userAgent(final @Nullable HttpServletRequest request) {
        final String value = request == null ? null : request.getHeader(HttpHeaders.USER_AGENT);
        final String truncated = SensitiveDataMasker.truncate(value, OperationLogAspect.MAX_TEXT_LENGTH);
        return truncated == null ? "" : truncated;
    }
}
