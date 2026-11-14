package com.wulicode.weiran.framework.autoconfigure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OptionalOpenApiTest {
    @Test
    @DisplayName("无 springdoc 的应用不会加载可选文档配置")
    void startsWithoutSpringdoc() {
        new ApplicationContextRunner()
                .withClassLoader(new FilteredClassLoader("org.springdoc", "io.swagger"))
                .withConfiguration(AutoConfigurations.of(WeiranOpenApiAutoConfiguration.class))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean("weiranResponseSchemas");
                });
    }
}
