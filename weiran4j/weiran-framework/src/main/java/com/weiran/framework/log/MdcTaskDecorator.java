package com.weiran.framework.log;

import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;

/**
 * 把提交任务时的 MDC（含请求号）带进线程池：执行时还原，执行完恢复工作线程原先的 MDC。
 *
 * <p>线程池复用线程，不恢复就会把上一个任务的请求号留给下一个任务。
 */
public final class MdcTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(final Runnable runnable) {
        final @Nullable Map<String, String> captured = MDC.getCopyOfContextMap();
        return () -> {
            final @Nullable Map<String, String> previous = MDC.getCopyOfContextMap();
            MdcTaskDecorator.apply(captured);
            try {
                runnable.run();
            } finally {
                MdcTaskDecorator.apply(previous);
            }
        };
    }

    private static void apply(final @Nullable Map<String, String> context) {
        if (context == null) {
            MDC.clear();
        } else {
            MDC.setContextMap(context);
        }
    }
}
