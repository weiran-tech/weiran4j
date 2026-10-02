# mono4j —— 常青藤赛事管理系统（weiran4j 下游）

本仓库以 **git fork** 跟随 [weiran4j](https://github.com/weiran-tech/weiran4j)（remote 名 `upstream`），在其上搭建
「常青藤全国青少年校园戏剧创意大赛」的后台；前台是 `uniapp/`（原 `cqt_uniapp`）。
**先读 `AGENTS.md`（上游规范，硬约束以它为准），再读本文件。**

## 先读这四条

1. **不改任何上游文件。** 只在契约 `weiran4j/docs/01-架构与接口契约.md` §2.2「下游扩展入口」列出的位置落改动，
   同步上游（`git fetch upstream && git merge upstream/main`）才不会冲突。框架有问题去 weiran4j 修，再 merge 回来。
   `scripts/biz/upstream-boundary.sh` 在提交时拦截对上游文件的改动（启用见下「常用命令」）。
2. **业务只有一个模块 `weiran-cqt`**（包 `com.weiran.cqt`）。宪法 CP-12 禁止业务模块互相依赖，
   而报名、评审、奖项共用作品数据，所以按子包分领域，不拆模块：
   `account`（C 端账号/短信/实名）· `content`（新闻/站点配置）· `match`（赛事/赛区/赛项/报名/作品/导入）·
   `review`（初审/省审/国审）· `award`（奖项/成绩/证书）。
3. **两类 HTTP 入口，响应格式不同：**

   | 入口 | 前缀 | 认证 | 响应 |
   | --- | --- | --- | --- |
   | 后台管理（`web/`） | `/api/cqt/**` | 框架 JWT + `@RequiresPermission("cqt:…")` | 框架统一包络 `{code:0}` |
   | 前台 uniapp | `/api-web/**` | 业务自己的 C 端 JWT 拦截器（框架 `AuthInterceptor` 只拦 `/api/**`） | Controller 标 `@SkipApiResponse`，返回 `{code:200, message, data}` |

   uniapp 的两个硬约定：**HTTP 状态必须是 2xx**（非 2xx 一律弹窗报错），**未登录用 body `code:401`** 表示。
   写前台接口的固定做法（`weiran-cqt-adapter` 的 `com.weiran.cqt.adapter.portal` 包，change `cqt-web-foundation`）：
   - Controller 类标 **`@PortalController`**（= `@RestController` + `@SkipApiResponse`），路径放 `/api-web/...`，返回 `PortalResult.ok(data)`；
   - 默认需要登录；免登录的方法或类标 **`@PortalPublic`**；当前账号用 `PortalAccount.current()`；
   - 出错直接抛 `BizException`（复用 `CommonErrors`），由 `PortalExceptionAdvice` 统一输出：HTTP 恒 200，`code` = 五位错误码前三位。
     这是对宪法 CP-11 的**有意偏离**，只限 `/api-web`；状态仍只由错误码决定，Controller 里不要手写 code、不要捕获转换；
   - 前台令牌由 `PortalTokenCodec` 签发 / 解析（HS256，`typ=cqt-web`，与后台令牌互斥）；**还没有吊销机制**，
     做账号登录时必须给 C 端账号加 `token_version` 并在载荷带 `ver`（宪法 CP-8，见 design 宪法对照）；
   - 集成测试写在 `weiran-app/src/test/java/com/weiran/app/Cqt*IT.java`（继承包级私有的 `IntegrationTestSupport`），
     测试专用 Controller 用测试类上的 `@Import` 注册；测试密钥在 `weiran-app/src/test/resources/application-biz-test.yml`。
4. **号段与表前缀**（登记在 `weiran4j/docs/business-modules.md`）：错误码序号 `20`–`39`、菜单 id `1000`–`1999`、
   权限码前缀 `cqt:`、Flyway 目录 `db/migration/cqt/`、表前缀 `cqt_`。
   原统一库 `cqtxj2026` 的表迁入时一律加 `cqt_` 前缀（2026-10-02 决定）。

## 下游自有文件（上游永不创建）

| 文件 / 目录 | 用途 |
| --- | --- |
| `AGENTS.biz.md` | 本文件 |
| `weiran4j/weiran-cqt/**` | 业务模块五层；五层必须一次建齐，缺层构建失败 |
| `weiran4j/docs/business-modules.md` 的 `weiran-cqt` 行 | 号段登记（上游只维护表头与基座行） |
| `weiran-cqt-*/src/main/resources/application-biz.yml` | 业务默认配置，全应用只能一份，**不放密钥**（走环境变量 `WEIRAN_CQT_*`） |
| `weiran-cqt-infrastructure/src/main/resources/db/migration/cqt/` | Flyway 脚本 `V<yyyyMMddHHmm>__cqt_<desc>.sql` |
| `web/src/pages/cqt/**` | 后台页面（菜单 `component` 指向这里） |
| `web/src/biz/icons*.ts` | 追加菜单图标 |
| `openspec/rules/advisory/components.biz.md` | 下游公共组件清单 |
| `openspec/state/bizs/README.biz.md` · `openspec/state/bizs/cqt_*.md` | 业务表现状文档与索引 |
| `uniapp/` | 前台 uniapp（独立安装，不在 pnpm 工作区） |
| `scripts/biz/` · `.githooks-biz/` | 下游脚本与提交钩子 |

已知缺口：往 `openspec/state/bizs/artifact.md` / `cross-biz.md` 登记条目仍要改上游文件（上游 artifact.md#20），
同步时可能冲突，手工合并即可。

## 常用命令

```bash
# 同步上游
git fetch upstream && git merge upstream/main
# 启用下游提交钩子（先跑上游 .githooks/pre-commit，再查上游文件边界）
git config core.hooksPath .githooks-biz
# 前台
cd uniapp && pnpm install && pnpm dev:h5
```

其余构建、检查命令与上游 `AGENTS.md` 相同（JDK 21、先 `spotlessApply` 再 `check`）。

## 部署与数据迁移

- 环境变量：`WEIRAN_CQT_JWT_SECRET`（前台令牌密钥，≥ 32 字节，**必填**，缺失启动失败）、`WEIRAN_CQT_JWT_TTL`（可选，默认 `7d`）。
  本地开发写进 gitignore 掉的 `weiran4j/config/application-local.yml`（`weiran.cqt.jwt.secret`）。
- 数据：Flyway 只建表；原统一库 `cqtxj2026` 的数据用 `scripts/biz/import/<表>.sql` 在切换时导入（源库与目标库同实例，可重复执行）。
  导入前先看 `openspec/state/bizs/cqt_setting.md#01`：`cqtxj2026.sql` 导出文件的中文是双重编码乱码，生产库是否同样乱码未确认。

## 规则索引（下游）

| 文件 | 什么时候**必须**读 | 有无机械校验 |
| --- | --- | --- |
| [`rules/advisory/components.biz.md`](openspec/rules/advisory/components.biz.md) | 写 `web/` 的页面或组件前，与上游 `components.md` 一起查；新增公共组件后回来登记 | 🟡 `REPO/components-unregistered` 只查名字是否登记 |
