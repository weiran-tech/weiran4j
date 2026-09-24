package com.weiran.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * weiran4j 应用入口。
 *
 * <p>这里不写 {@code @ComponentScan} 的包范围：各业务模块通过
 * {@code META-INF/spring/...AutoConfiguration.imports} 自行登记装配，
 * 应用只负责把它们放进 classpath。新增模块时改 {@code build.gradle.kts} 的依赖即可，
 * 不用回来改扫描路径。
 */
@SpringBootApplication
public class WeiranApplication {

    /** 启动应用。 */
    public static void main(final String[] args) {
        SpringApplication.run(WeiranApplication.class, args);
    }
}
