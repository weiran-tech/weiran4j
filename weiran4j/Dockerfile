# syntax=docker/dockerfile:1
# weiran4j 后端镜像（docs/02-部署.md）。构建上下文是 weiran4j/：
#   docker build -t weiran4j-backend weiran4j
# 镜像构建不跑测试：测试由本地 L7 门禁与 GitHub CI 负责（集成测试需要 Docker，构建容器里没有）。

# ---- 构建 ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
# settings.gradle.kts 按目录自动发现模块（D-012），只拷构建脚本跑不起来，所以整份拷贝；
# 依赖缓存改用 BuildKit 缓存挂载，源码改动不必重新下载。
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon :weiran-app:bootJar -x test \
    && cp weiran-app/build/libs/weiran-app-*.jar /src/app.jar

# ---- 运行 ----
FROM eclipse-temurin:21-jre
# 非 root 运行（uid 10001）；日志目录归它所有，Compose 在这里挂卷。
RUN groupadd --system --gid 10001 weiran \
    && useradd --system --uid 10001 --gid weiran --home-dir /app --no-create-home weiran \
    && mkdir -p /app/logs \
    && chown -R weiran:weiran /app
WORKDIR /app
COPY --from=build --chown=weiran:weiran /src/app.jar /app/app.jar
USER weiran
ENV WEIRAN_LOG_DIR=/app/logs
EXPOSE 3300
# exec 形式：java 是 PID 1，能直接收到 SIGTERM，触发优雅停机。
# 时区用 JVM 参数而不是 TZ 环境变量：JRE 镜像没有 tzdata，TZ 不生效，日志时间会变成 UTC；Java 自带时区库。
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.timezone=Asia/Shanghai", "-jar", "/app/app.jar"]
