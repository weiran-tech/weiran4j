package com.weiran.framework.log;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class MdcTaskDecoratorTest {

    @AfterEach
    void clear() {
        MDC.clear();
    }

    @Test
    @DisplayName("任务执行时带提交方的 MDC，执行完恢复工作线程原先的 MDC")
    void propagatesAndRestores() {
        final List<String> seen = new ArrayList<>();
        MDC.put("requestId", "r1");
        final Runnable decorated = new MdcTaskDecorator().decorate(() -> seen.add(MDC.get("requestId")));

        // 模拟工作线程：它原先带着别的上下文
        MDC.clear();
        MDC.put("requestId", "worker");
        decorated.run();

        assertThat(seen).containsExactly("r1");
        assertThat(MDC.get("requestId")).isEqualTo("worker");
    }

    @Test
    @DisplayName("提交方没有 MDC 时，任务内也没有；工作线程原本为空时执行完仍为空")
    void handlesEmptyContext() {
        final List<String> seen = new ArrayList<>();
        final Runnable decorated = new MdcTaskDecorator().decorate(() -> seen.add(MDC.get("requestId")));
        MDC.put("requestId", "leftover");
        decorated.run();
        assertThat(seen).containsNull();
        MDC.clear();
        decorated.run();
        assertThat(MDC.getCopyOfContextMap()).isNullOrEmpty();
    }
}
