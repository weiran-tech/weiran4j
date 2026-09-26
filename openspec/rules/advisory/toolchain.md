# toolchain.md —— 工具行为与代码库欠账

> **本文件没有任何机械守卫。** 唯一的唤起途径是 `CLAUDE.md` 的规则索引表 ——
> 索引表里那行触发条件命中了,才会有人打开这里。
>
> **准入门槛两条,缺一不写**:
>
> 1. **真踩过** —— 推测出来的「可能会有问题」不要写。没踩过的条目会稀释真条目的可信度,
>    读的人分不清哪条是实测、哪条是想象,最后整份文件一起被当成背景噪音。
> 2. **写清症状** —— 这里的坑共同点是**不报错**。只有写出「谁会因此拿到错的东西」,
>    下一个人才认得出自己正在踩它。只写「XX 行为怪」的条目过段时间没人认得出指什么。
>
> 归属判断(某条规则该写这里还是别处)见 [`../README.md`](../README.md) 的决策流程 ⑤⑥。

## 与相邻文件的分工

| 文件 | 装什么 |
|---|---|
| [`enforced/constitution.md`](../enforced/constitution.md) | 跨 change 恒成立的代码不变量(CP-N),有机械校验 |
| [`pitfalls.md`](pitfalls.md) | 走 OpenSpec 流水线时**某一层**踩过的坑(按 L0–L10 分节) |
| **本文件** | 前两者都装不下的:**工具本身的行为**与**代码库既有欠账** |

---

## 构建工具链

### Gradle 配置缓存与 Spotless 不兼容

**症状**:`./gradlew spotlessApply` 或 `check` 随机报
`palantir-java-format(java.lang.reflect.InvocationTargetException)`,且**每次失败的文件都不一样**——
看起来像「某几个文件的格式有问题」,实际与文件内容完全无关,改那些文件不会让它变绿。

palantir-java-format 需要 javac 内部 API 的模块开放(`--add-exports`),
而配置缓存恢复出来的类加载器里拿不到,`IllegalAccessError` 被包成上面那个异常抛出。

**现状**:配置缓存**保持关闭**。实测记录与对照写在 `gradle.properties` 里。
已登记为 [`state/bizs/artifact.md#01`](../../state/bizs/artifact.md)。

### JDK 版本必须是 21,且 daemon 会记住错的那个

**症状**:同上 —— palantir-java-format 崩溃,报错指向代码。

本机默认 JDK 可能高于 21;Gradle daemon 一旦在高版本上起来,后续命令即使改了
`JAVA_HOME` 也可能复用那个 daemon。所有 Gradle 命令前置
`JAVA_HOME=$(/usr/libexec/java_home -v 21)`,或用 `mise` 自动切换。
换版本后如果仍然报错,`./gradlew --stop` 杀掉旧 daemon 再试。

### 复用的 daemon 会让 palantir 在所有文件上报 `NoClassDefFoundError`

**症状**(2026-09-26 实测):`spotlessJavaCheck` 在**几乎所有文件**上报
`palantir-java-format(java.lang.NoClassDefFoundError) Could not initialize class com.palantir.javaformat.java.ImportOrderer`,
构建 2~3 秒就失败。同一份代码,另一个进程刚刚全绿。

`Could not initialize class` 的意思是:这个 daemon 里 palantir 的静态初始化**曾经失败过一次**,
此后同一 JVM 内每次使用都直接报这个错——与当前文件内容无关。实测在**多个进程/agent 共用
同一个 Gradle 用户目录**时出现(一方的 daemon 被另一方复用)。

**处置**:`./gradlew --stop` 后重跑,或直接 `./gradlew check --no-daemon`。验证用的全量构建优先 `--no-daemon`。

### turbo 会静默丢弃没声明过的环境变量

**症状**(2026-09-26 实测):`SERVER_PORT=3399 pnpm dev` 后端仍然起在 3300(端口被占时报
`Port 3300 was already in use`),而同一条命令里的 `VITE_PORT=5399` 却生效了。直接跑
`SERVER_PORT=3399 node weiran4j/scripts/dev.mjs` 又是好的 —— 所以不是 Gradle daemon 或 Spring 的问题。

turbo 2.x 默认**严格环境变量模式**:只有 `turbo.json` 里声明的变量才会传给任务。`VITE_*` 能过,
是因为 turbo 识别出 Vite 框架、自动放行了这个前缀;`SERVER_PORT`、`WEIRAN_*` 没人声明,就被拦了,**不报任何错**。

**处置**:要传给后端的变量加进 `turbo.json` 里 `dev` 任务的 `passThroughEnv`
(已有 `JAVA_HOME`、`JAVA_HOME_21`、`WEIRAN_*`、`SERVER_PORT`、`SPRING_*`)。

### 只改大小写的文件重命名,在 macOS 上会被 git 吞掉

**症状**(2026-09-26 实测):本机构建一直是绿的,换个时间点(`git switch` / 新 clone / IDE 里跑 `bootRun`)
突然编译失败:`类 MybatisRoleRepository 是公共的, 应在名为 MybatisRoleRepository.java 的文件中声明`,
而磁盘上的文件叫 `MyBatisRoleRepository.java`。Linux / CI 上 clone 下来**必然**失败。

macOS 的文件系统不区分大小写,git 默认 `core.ignorecase=true`。把 `MyBatisXxx.java` 换成 `MybatisXxx.java`
时,git 把它当成**同一个文件的内容修改**(`git show --name-status` 显示 `M` 而不是 `R`),
提交里存的仍是旧大小写;此后任何按提交内容重写工作区的操作(switch / checkout / clone)都会把旧名字写回来。
提交前本机的构建是绿的 —— 那时磁盘上的名字恰好是对的,所以**任何本地验证都拦不住它**。

**处置**:两步 `git mv`(`git mv A.java A.java.tmp && git mv A.java.tmp a.java`),确认 `git status` 显示 `R`。
**提交前自查**:改过类名大小写后,`git diff --cached --name-status` 里应该是 `R`;
或全仓扫一遍「`public class` 名与文件名不一致」的 `.java`。

### 两个 `clean check` 同时跑会互相删 build 目录

**症状**:集成测试**全部**在加载 Spring 上下文时失败,日志里夹着
`FileNotFoundException: .../build/jacoco/test.exec` 或
`NoSuchFileException: .../test-results/test/binary/in-progress-results-generic.bin`。

另一个进程(人或 agent)的 `clean` 删掉了本次构建正在用的编译产物与测试结果。
**同一工作区同一时刻只跑一个 Gradle 构建**,与 `project.md` WT-0 的「工作区只有一个」同理。

---

## 跨项目契约

### 统一响应体的 `code` 是**数字 0**,别从旧代码搬字符串判断

**症状**:从 weiran4j 旧版(wuli3 底座时期,`code === "0"` 字符串)或 PHP 侧 weiran-v1
(`status === 0`)搬来的前端代码,**永远走错误分支**或永远走成功分支——不报错,只是判错。

2026-09-26 重写(D-008)后的唯一格式:`{code, message, data}`,**`code === 0`(数字)为成功**,
失败为五位数字错误码(前三位即 HTTP 状态,如 `40100`)。见 `docs/01-架构与接口契约.md` §4。

---

## 待补

本文件目前只覆盖构建工具链与响应体契约两类。其余工具行为(MyBatis-Plus、
JWT、前端 Vite/TanStack Query)**尚未踩过值得记录的坑** ——
按上方准入门槛,踩到了再写,不预先编造。
