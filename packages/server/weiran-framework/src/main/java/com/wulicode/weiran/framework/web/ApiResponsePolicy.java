package com.wulicode.weiran.framework.web;

import java.lang.reflect.Method;
import org.springframework.core.annotation.AnnotatedElementUtils;

/** 运行时与文档共用的响应包装边界。 */
public final class ApiResponsePolicy {
    private ApiResponsePolicy() {}

    /** 是否使用统一响应包装。 */
    public static boolean applies(final Class<?> controller, final Method method) {
        return controller.getPackageName().startsWith("com.wulicode.weiran.")
                && !AnnotatedElementUtils.hasAnnotation(method, SkipApiResponse.class)
                && !AnnotatedElementUtils.hasAnnotation(controller, SkipApiResponse.class);
    }
}
