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
已登记为 [`state/waitlist.md`](../../state/waitlist.md) 的 T-001。

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
