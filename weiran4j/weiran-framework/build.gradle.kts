plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran4j Spring 基础设施：统一响应、全局异常、认证拦截与权限注解、操作日志切面、MyBatis-Plus 与 Jackson 配置。"

dependencies {
    api(project(":weiran-common"))
    api("org.springframework.boot:spring-boot-starter-web")
    api("org.springframework.boot:spring-boot-starter-validation")
    api("org.springframework.boot:spring-boot-starter-aop")
    api("com.baomidou:mybatis-plus-spring-boot3-starter")
    // 3.5.9 起分页插件 PaginationInnerInterceptor 在这个模块里。
    api("com.baomidou:mybatis-plus-jsqlparser")
}
