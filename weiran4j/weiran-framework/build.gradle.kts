plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran4j 框架层：纯 Java 通用契约（错误码、业务异常、统一响应、分页、树工具）+ Spring 基础设施（全局异常、" +
    "认证拦截与权限注解、操作日志切面、MyBatis-Plus 与 Jackson 配置）。"

dependencies {
    // 框架库一律 implementation，不向下游传递（D-016）：业务模块的 domain / api 层依赖本模块只为纯 Java 契约包，
    // 编译期看不到 Spring 与 MyBatis（宪法 CP-1）。application / infrastructure / adapter 用到哪个框架库自己声明。
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("com.baomidou:mybatis-plus-spring-boot3-starter")
    // 3.5.9 起分页插件 PaginationInnerInterceptor 在这个模块里。
    implementation("com.baomidou:mybatis-plus-jsqlparser")
}
