# weiran4j

PHP 项目 [weiran-v1](/Users/duoli/Projects/duoli-weiran/weiran-v1)（Laravel 10 模块化框架）的 Java 重做。
本目录是 monorepo：**Java 后端（Gradle 多模块）+ 前端 web（pnpm）+ openspec 工作流**。

## 先读这三条

1. **构建必须用 JDK 21。** 本机默认 JDK 可能更高，Gradle daemon 跑在高版本上
   palantir-java-format 会直接崩，报错看起来像代码问题但不是。
   所有 Gradle 命令前置 `JAVA_HOME=$(/usr/libexec/java_home -v 21)`，或用 `mise` 自动切换。
2. **底座 wuli3 尚未发布到公司 Nexus。** 首次构建前必须先把它发到本地 Maven 仓库：
   `git clone git@github.com:Y-cs/wuli3-gradle.git && cd wuli3-gradle && ./gradlew publishToMavenLocal -x test`
3. **改代码后先 `./gradlew spotlessApply` 再 `check`。** 格式由 palantir-java-format 强制，
   手写的换行几乎一定会被判违规——那不是代码问题，别去猜。

## 常用命令

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

./gradlew spotlessApply           # 格式化（改完代码先跑这个）
./gradlew check                   # 全量门禁：编译 + 测试 + Checkstyle + SpotBugs
                                  #   + Forbidden APIs + Error Prone/NullAway + 覆盖率
./gradlew :weiran-system-domain:check   # 只验一个模块，迭代时用
./gradlew :weiran-app:bootRun     # 起服务（需要 MySQL 与 WEIRAN_JWT_SECRET）

pnpm install                      # 前端依赖
pnpm dev                          # 前端开发服务器（默认 5373，代理 /api 到 3300）
pnpm test                         # 前端单测

node openspec/check.mjs           # openspec 流水线校验
node openspec/check.mjs --explain # 看全部检查项
```

> ⚠️ **不要打开 Gradle 配置缓存。** 打开后 Spotless 的 palantir 步骤会随机报
> `palantir-java-format(java.lang.reflect.InvocationTargetException)`，且每次失败的文件都不一样
> ——看起来像某些文件格式有问题，实际与文件内容无关。原因与实测对照写在 `gradle.properties` 里。

## 仓库结构

```
weiran4j/
├── build-logic/              # Gradle 约定插件。质量规则的唯一来源，不要在模块里重复配置
├── weiran-dependencies/      # 本仓 BOM。所有版本号只在这里出现
├── weiran-common/            # 跨模块通用：错误码基座、分页契约
├── weiran-system/            # 账号 / RBAC / JWT 登录（DDD 五层）
│   ├── weiran-system-api/            # 对外契约。不依赖 Spring，不依赖领域层
│   ├── weiran-system-domain/         # 领域模型 + 端口。不依赖任何框架
│   ├── weiran-system-application/    # 用例编排 + 事务边界
│   ├── weiran-system-infrastructure/ # MyBatis-Plus / JWT / 密码算法
│   └── weiran-system-adapter/        # Controller / 认证过滤器
├── weiran-app/               # 可执行应用。只做依赖聚合，没有业务代码
├── web/                      # 前端：Vite + React 19 + TanStack Query
├── openspec/                 # 需求到交付的流水线（L0–L10 闸门）
└── docs/                     # 决策记录、模块映射、迁移注意事项
```

模块路径是**扁平**的（`:weiran-system-api`），目录是**嵌套**的（`weiran-system/weiran-system-api`）——
映射写在 `settings.gradle.kts` 底部。新增模块照那里的写法追加。

## 分层规矩

依赖只能从外向内：`adapter → application → domain`，`infrastructure → domain`。

- **domain 不依赖任何框架**。领域规则的单测必须能在不启动 Spring 的情况下跑。
- **持久化类型不跨层**：`*DO`、`BaseMapper`、`IPage`、`Wrappers` 只允许出现在 `*-infrastructure` 里。
- **端口定义在 domain，实现在 infrastructure**。端口签名里出现框架类型，这层反转就白做了。
- **模块自己负责装配**：每个模块用 `@AutoConfiguration` + `META-INF/spring/...imports` 自我登记，
  应用侧不写 `@ComponentScan` / `@MapperScan`。新增模块时 `weiran-app` 只加一行依赖。

完整不变量见 `openspec/rules/enforced/constitution.md`（CP-1 … CP-11），每个 change 的 design 都要逐条对照。

## 写 Java 代码时

这些不是风格偏好，是门禁会拦的硬约束：

- **禁 `java.util.Date` / `Calendar` / `java.sql.Date|Time|Timestamp`**，一律 `java.time`。
  无法回避的第三方边界用 `@SuppressForbidden` 就地豁免并写明理由，不要关规则。
- **禁中文标识符**（ErrorProne `UnicodeInCode`）。测试方法名用英文 + `@DisplayName("中文")`。
- **空安全用 JSpecify**：包上标 `@NullMarked`，可空处标 `@Nullable`。
  框架反射填充的类（如 MyBatis 的 `*DO`）整类标 `@NullUnmarked`，并把空值处理集中在映射边界。
- **字段、参数、局部变量能 final 就 final**；实例成员访问显式写 `this.`，静态成员用类名限定。
- **行宽 140**，禁 `import *`，禁未使用的 import。

## 与 PHP 项目的关系

迁移期两套系统**并行读写同一套 `pam_*` 表**。因此：

- 改这些表的结构前，必须去 weiran-v1 核对迁移文件与 Model，并说明对 PHP 侧是否破坏性（宪法 CP-7）。
- 密码有两套算法：新账号 BCrypt，存量是 PHP 的 `md5(sha1(明文 + 注册时间) + password_key)`。
  历史算法**只用于校验**，验通后立即重哈希（宪法 CP-8）。详见 `docs/20-数据迁移注意事项.md`。
- 统一响应格式**与 PHP 侧不同**：PHP 是 `{status, message, data}`（status 数字 0 为成功），
  weiran4j 走底座的 `{code, message, timestamp, requestId, data}`（**code 是字符串 `"0"`**）。
  前端从别处搬代码时 `code !== 0` 会恒真，务必注意。

## 密钥

任何密钥都不进版本库、不进日志（宪法 CP-9）。配置走环境变量或 Jasypt，仓内只有 `.env.example`。

> weiran-v1 的 `README.md` 里至今明文存着阿里云 AccessKey 与推送 SECRET，且已进入 git 历史。
> **那批密钥建议轮换，并且绝不迁移到本仓。**
