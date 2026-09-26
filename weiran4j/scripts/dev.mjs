#!/usr/bin/env node
// 后端开发启动:`pnpm dev`(turbo)在本包里调用它,等价于
//   JAVA_HOME=<JDK 21> ./gradlew :weiran-app:bootRun
//
// 为什么不直接在 package.json 里写那行 shell:
//   1. JDK 21 是硬要求(高版本 JDK 上 palantir-java-format 会崩,报错却指向代码),
//      这里按 JAVA_HOME_21 → macOS java_home → 现有 JAVA_HOME 的顺序找,找不到就明确报错;
//   2. 缺 config/application-local.yml 时 Spring 会抛一长串「JWT 密钥为空」的堆栈,
//      淹没在 turbo 的多路日志里很难认出来 —— 这里先给一句人话。
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function resolveJavaHome() {
    if (process.env.JAVA_HOME_21) return process.env.JAVA_HOME_21;
    if (process.platform === 'darwin') {
        try {
            return execFileSync('/usr/libexec/java_home', ['-v', '21'], { encoding: 'utf8' }).trim();
        } catch {
            // 没装 JDK 21,落到下面的 JAVA_HOME
        }
    }
    return process.env.JAVA_HOME;
}

const javaHome = resolveJavaHome();
if (!javaHome) {
    console.error('[server] 找不到 JDK 21:请安装 JDK 21,或设置 JAVA_HOME_21 / JAVA_HOME 指向它。');
    process.exit(1);
}

if (!existsSync(join(ROOT, 'config', 'application-local.yml'))) {
    console.warn(
        '[server] ⚠️ 缺少 weiran4j/config/application-local.yml —— 数据库密码与 JWT 密钥读不到,启动会失败。\n'
            + '         cp weiran4j/config/application-local.yml.example weiran4j/config/application-local.yml 后填值。',
    );
}

// --console=plain:turbo 会把多个任务的输出混排,Gradle 默认的富文本进度条在这里只会刷屏。
const gradle = spawn('./gradlew', [':weiran-app:bootRun', '--console=plain', ...process.argv.slice(2)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, JAVA_HOME: javaHome },
});

// turbo 结束时会给子进程发信号;转给 Gradle 客户端,它会取消构建并停掉 bootRun 拉起的应用 JVM。
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => gradle.kill(signal));
}
gradle.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
