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

### 底座 wuli3 只在本地 Maven 仓库里

**症状**:新 clone 的仓库直接构建失败,报找不到 `com.kjs.wuli3:*:0.1.0-SNAPSHOT`,
**错误信息不会提示需要先发布底座**。CI 同样无法直接构建。

`settings.gradle.kts` 现在挂着 `mavenLocal()`。首次构建前必须先发布底座:

```bash
git clone git@github.com:Y-cs/wuli3-gradle.git && cd wuli3-gradle
./gradlew publishToMavenLocal -x test
```

已登记为 [`state/waitlist.md`](../../state/waitlist.md) 的 T-002,
拿到公司 Nexus 地址后关闭。

---

## 跨项目契约

### 统一响应体的 `code` 是**字符串**,不是数字

**症状**:从别处(尤其 PHP 侧 weiran-v1)搬来的前端代码里 `code !== 0` **恒为真**,
表现是「接口明明 200 且数据正常,前端却一律走错误分支」。不报错,只是永远走错分支。

两套系统的响应格式不同:

| | 形状 | 成功判据 |
|---|---|---|
| PHP(weiran-v1) | `{status, message, data}` | `status === 0`(数字) |
| weiran4j(走 wuli3 底座) | `{code, message, timestamp, requestId, data}` | `code === "0"`(**字符串**) |

---

## 待补

本文件目前只覆盖构建工具链与响应体契约两类。其余工具行为(MyBatis-Plus、
JWT、前端 Vite/TanStack Query)**尚未踩过值得记录的坑** ——
按上方准入门槛,踩到了再写,不预先编造。
