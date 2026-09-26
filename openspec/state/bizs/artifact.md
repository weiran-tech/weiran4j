# artifact —— 架构与技术问题

> 不专属任何单一业务表的架构、共享组件、契约、测试、工具、门禁问题。
> 属于 `state/`,**只描述事实,不是规范**:过期不会被 `check.mjs` 拦截,以代码为准。
> 条目格式与编号规则见 [`README.md`](README.md)「编号约定」;盘点基线 `e23c511`(2026-09-26)。

## 已知问题汇总

- **#01 ⚠️ P3 Gradle 配置缓存被迫关闭**
  症状:冷构建配置阶段慢几秒,所有开发者都受影响。
  Spotless 的 palantir-java-format 在配置缓存恢复的类加载器里拿不到 `--add-exports` 的模块开放,
  `IllegalAccessError` 被包成 `palantir-java-format(InvocationTargetException)` 随机报错
  (实测记录见 `weiran4j/gradle.properties`)。
  关闭条件:Spotless 修复配置缓存兼容性,或改用不依赖 javac 内部 API 的格式化器。(原全局编号待办的第 1 条,随全局编号废止改为本编号)

- **#02 ⚠️ P2 权限缓存只在单节点内生效**
  症状:多节点部署时,在 A 节点改了某用户的角色/菜单或吊销其令牌,B 节点在最长 30 秒内仍按旧权限放行。
  `TokenAuthenticator` 的实现用进程内 Caffeine 缓存(30s),失效只作用于本进程。
  单节点部署不受影响;上多节点前需要改成分布式失效(如 Redis 广播)或缩短 TTL。

- **#03 ⚠️ P2 客户端 IP 直接信任 `X-Forwarded-For`**
  症状:登录日志与操作日志里的 IP 可被请求方任意伪造,安全回溯时拿到的是假地址。
  `weiran-framework` 的 `ClientIpResolver` 取 `X-Forwarded-For` 首个值,不校验请求是否来自可信代理。
  关闭条件:配置可信代理网段,只有来自可信代理的请求才读该头。

- **#04 ⚠️ P3 OpenAPI 文档不体现统一响应包络**
  症状:按 `/v3/api-docs` 生成客户端的人拿到的返回类型是裸业务对象,实际响应外面还有 `{code, message, data}`。
  包装发生在 `ApiResponseBodyAdvice`(运行期),springdoc 只看 Controller 的声明返回类型。

- **#05 🔴 P1 没有 CI:门禁 ③ 不存在**
  症状:后端 `./gradlew check`(含 Testcontainers 集成测试)与前端 `lint/test/build` 只在本地跑;
  跳过 pre-commit(`--no-verify`)或没跑 `pnpm hooks:install` 的提交,没有任何一道关口会发现回归。
  仓库没有 `.github/workflows/`。关闭条件:加一个在 PR 上跑后端 `check`、前端 `lint/test/build`
  与 `node openspec/check.mjs` 的 workflow。

- **#06 ⚠️ P3 前端产物未分包**
  症状:首屏需加载约 2.2 MB 静态资源(Semi UI 全量),弱网下登录页白屏时间长。
  `web/vite.config.ts` 没有任何 `manualChunks`(D-007 有意不照搬 mono4ts 的分包调优),等体积真成问题再处理。

- **#07 ⚠️ P3 `*-api` / `*-domain` 模块被约定插件注入 `slf4j-api`**
  症状:宪法 CP-2 说这两层「只能依赖 `weiran-common`」,但 `build-logic` 的 `JavaConventionsPlugin`
  给所有 Java 模块都加了 `slf4j-api`,按字面读会以为违反了宪法。实际只是日志门面,不影响分层。
  关闭条件:要么在 CP-2 里写明 `slf4j-api` 例外,要么约定插件对 api/domain 不注入。

- **#08 ⚠️ P3 登录并发回归测试未在旧实现上验证过**
  症状:`UserRoleIT.concurrentLoginsDoNotUndoPasswordResets` 是为「登录整行回写撤销改密」而写的竞态测试,
  但没有在旧实现上回跑过,不能证明它真能抓住这个回归(竞态本身是概率性的)。

- **#09 🔴 P2 `weiran4j/.env.example` 仍是重写前的内容**
  症状:按它配置部署环境的人会拿到旧库名与已不存在的 PHP / `pam_*` 说明,且缺 `WEIRAN_JWT_TTL`。
  权限规则禁止 agent 读写 `.env*` 文件,需要人工更新。应列出:`WEIRAN_DB_URL`(库名 `weiran4j`)、
  `WEIRAN_DB_USERNAME`、`WEIRAN_DB_PASSWORD`、`WEIRAN_JWT_SECRET`(至少 32 字节)、`WEIRAN_JWT_TTL=12h`、
  `WEIRAN_PORT=3300`、`WEIRAN_LOG_LEVEL`。

## changelog

**2026-09-26**(D-008 框架重写 + openspec 移到仓库根)

- 本文件建立,收纳原 `state/waitlist.md` 仍有效的「Gradle 配置缓存被迫关闭」(→ #01)与重写后盘点出的架构 / 技术问题。
- 原 `waitlist.md` 其余 6 条随 D-008 重写失效(wuli3 依赖、`pam_*` 表、Ban、`PamService` 均已不存在),
  不迁入本文件;原文见 git 历史 `weiran4j/openspec/state/waitlist.md`。
