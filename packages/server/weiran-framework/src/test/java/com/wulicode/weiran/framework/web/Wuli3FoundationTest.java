package com.wulicode.weiran.framework.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusInnerInterceptorAutoConfiguration;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.wulicode.weiran.framework.autoconfigure.WeiranFrameworkAutoConfiguration;
import com.wulicode.wuli3.mysql.autoconfigure.MysqlAutoConfiguration;
import com.wulicode.wuli3.spring.autoconfigure.ContextAutoConfiguration;
import java.util.Collections;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class Wuli3FoundationTest {

    @Test
    @DisplayName("Wuli3 上下文与 Weiran 分页装配共存，分页实现只有一个来源")
    void foundationCoexistsWithWeiranPagination() throws Exception {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(
                        ContextAutoConfiguration.class,
                        MysqlAutoConfiguration.class,
                        MybatisPlusInnerInterceptorAutoConfiguration.class,
                        WeiranFrameworkAutoConfiguration.class))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasBean("contextReader").hasBean("contextManager");
                    assertThat(context).hasBean("contextPropagator").hasSingleBean(MybatisPlusInterceptor.class);
                    assertThat(context.getBean(MybatisPlusInterceptor.class).getInterceptors())
                            .singleElement()
                            .isInstanceOf(PaginationInnerInterceptor.class);
                });
        assertThat(Collections.list(Wuli3FoundationTest.class
                        .getClassLoader()
                        .getResources(
                                "com/baomidou/mybatisplus/extension/plugins/inner/PaginationInnerInterceptor.class")))
                .hasSize(1);
    }
}
