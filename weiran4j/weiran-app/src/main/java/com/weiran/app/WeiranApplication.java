package com.weiran.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * weiran4j 启动类。
 *
 * <p>刻意不写 {@code @ComponentScan} / {@code @MapperScan}：framework、system、platform 各层都用
 * {@code AutoConfiguration.imports} 自我登记，新增业务模块时这里只需要在 build 脚本里加依赖。
 */
@SpringBootApplication
public class WeiranApplication {

    /** 启动入口。 */
    public static void main(final String[] args) {
        SpringApplication.run(WeiranApplication.class, args);
    }
}
