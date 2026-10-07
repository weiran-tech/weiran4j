package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@code weiran4j/.env.example} 与 {@code application.yml} 的环境变量清单保持一致（deployment FR-001）。
 *
 * <p>改配置时漏改 {@code .env.example}，部署的人就会少配一个变量——这类错误不报错，只在线上表现为「默认值不对」。
 * 测试的工作目录是 {@code weiran-app/}（Gradle 默认）。
 */
class EnvExampleTest {

    /** 只给 Docker Compose 用、不出现在 application.yml 里的变量。 */
    private static final Set<String> COMPOSE_ONLY = Set.of("WEIRAN_WEB_PORT");

    private static final Pattern PLACEHOLDER = Pattern.compile("\\$\\{(WEIRAN_[A-Z0-9_]+)");

    private static final Pattern DECLARED = Pattern.compile("(?m)^(WEIRAN_[A-Z0-9_]+)=");

    private static Set<String> collect(final Pattern pattern, final Path file) throws IOException {
        final Matcher matcher = pattern.matcher(Files.readString(file, StandardCharsets.UTF_8));
        final Set<String> names = new TreeSet<>();
        while (matcher.find()) {
            names.add(matcher.group(1));
        }
        return names;
    }

    @Test
    @DisplayName(".env.example 声明的变量 = application.yml 的 ${WEIRAN_*} 占位符 + Compose 专用变量")
    void envExampleMatchesApplicationYml() throws IOException {
        final Set<String> expected = EnvExampleTest.collect(
                EnvExampleTest.PLACEHOLDER, Path.of("src", "main", "resources", "application.yml"));
        expected.addAll(EnvExampleTest.COMPOSE_ONLY);
        final Set<String> declared = EnvExampleTest.collect(EnvExampleTest.DECLARED, Path.of("..", ".env.example"));

        assertThat(declared).as("weiran4j/.env.example 的变量（未注释的 NAME= 行）").isEqualTo(expected);
    }
}
