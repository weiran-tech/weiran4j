# auth-seams-cookie-ci · 验收摘要

**做了什么**:一次处理认证体系与工程门禁的 7 条问题:
- 认证拆成「验令牌 / 认身份 / 定权限」三段,按 JWT `iss` 分发,JWT 增加 `iss` / `aud`;
- 宪法 CP-8 拆成本地令牌与联邦令牌两段;
- 基座新增只校验凭据的 `AuthService.authenticate`;
- 新增决策 D-014;
- 吊销判定每次查库,关掉了多实例下的吊销窗口;
- 浏览器令牌改走 HttpOnly Cookie + 双提交 CSRF,前后端写死同源;
- 新增 GitHub Actions CI。

逐条核对与结论见 `exec/verify.md`。

**运行时 / 手工验证**(verify.md 只记了结论,这里记操作):
- 本机 `pnpm dev`,在 cmux 内置浏览器(surface:27)里用 `cmux browser` 驱动真实页面:
  1. 登出,Cookie 库清空;
  2. 表单登录,页面脚本只能看到 `weiran_csrf`;
  3. 刷新,仍在登录态;
  4. 个人中心改昵称并保存;
  5. 临时打开锁屏偏好,输错密码、再输对密码解锁;
  6. 再次登出。

  第 4、5 步用页面内的 fetch 钩子确认写请求带 `X-CSRF-Token`、不带 `Authorization`。验证中改过的昵称与锁屏偏好都已恢复,浏览器最后重新登录。
- `curl` 加 cookie jar 经 vite 代理走了一遍接口。注意:本机 curl 默认会被系统 HTTP 代理接管(返回「Connection Closed」页),要加 `NO_PROXY='*'`。
- `VITE_API_BASE_URL=https://example.com pnpm --filter @weiran/web build`:按预期失败。
- 未做:CI 没有在 GitHub runner 上跑过(本机没有 actionlint,只做了 YAML 解析)。**合入后第一次 PR 的运行结果补记在这里**。

**已知缺口**:
- `artifact.md#02`(🟡 剩余角色 / 权限的 30s 多实例窗口);
- `artifact.md#12`(没有分支保护,CI 红了也能合);
- `artifact.md#09`(`.env.example` 其余部分仍是旧内容)。

**交给使用者的注意事项**:
- 配置键 `weiran.system.jwt.*` 改为 `weiran.auth.jwt.*`,环境变量名不变。本机 `config/application-local.yml` 要同步改,http 本地开发还要加 `weiran.auth.cookie.secure: false`。
- 合入后已签发的旧令牌全部失效(没有 `iss`),需要重新登录。
- 部署必须同源:反向代理把 `/api` 转给后端,并透传 `Cookie`、`Set-Cookie`、`X-CSRF-Token`。
- 脚本或非浏览器调用登录时带 `X-Auth-Mode: token`,从响应体拿令牌,之后用 Bearer 头调用,不需要 CSRF 头。
