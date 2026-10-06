# E4: docs-browser

## 完成的 tasks.md 条目

`6.1-6.4`、`7.4`、`8.1`

## 改了什么

| 文件 | 说明 |
|---|---|
| `weiran4j/docs/00-决策记录.md` | D-015 |
| `weiran4j/docs/02-部署.md` | §5a 外部身份提供方;首次部署检查清单加一条 |
| `weiran4j/.env.example` | 整份重写:新增 `WEIRAN_PUBLIC_BASE_URL`、`WEIRAN_PASSWORD_LOGIN_ENABLED`、提供方注释示例;头部改为 `COMPOSE_ENV_FILES` 用法。diff 为 +22 −1,说明原有内容逐字一致 |
| `openspec/state/bizs/{sys_user_identity.md(新),sys_user.md,README.md}` | 新表文档;无本地密码用户、列宽 #10;索引 |
| `AGENTS.md` | 门禁 ③ 改为 ✅ 并写明分支保护;认证要点补外部登录 |

## 真实浏览器验证(7.4)

- **环境**:本机起 Keycloak 容器(18081,导入测试 realm);`pnpm dev` 配置一个开启自动开通的 OIDC 提供方 `keycloak`;在 cmux 浏览器新开一个分屏(surface:1000000012)。
- **步骤与结果**:
  1. 登录页出现「使用 Keycloak 登录」按钮;
  2. 点击后跳到 Keycloak 登录页,用 carol / carol-pass 登录;
  3. 回到 `/dashboard`,顶栏显示「Carol Auto」(自动开通,昵称取自 `name`);
  4. 刷新后仍在登录态;
  5. 个人中心:用户名 carol,邮箱 `carol@example.com`(`email_verified`);「外部账号」卡片显示 Keycloak 绑定;修改密码区提示「未设置本地密码」;
  6. 登出:跳到 Keycloak 登出确认页(没传 `id_token_hint` 时 Keycloak 的标准行为),确认后回到 `/login`,`weiran_csrf` 已清除,调用 `/api/auth/me` 返回 401。
- **清理**:删除自动开通的 carol(本地库 id 3),停止 dev,删除 Keycloak 容器。

## 越界申报

无。

## 埋的坑 / 遗留

- [ ] Keycloak 登出会多一个确认页,因为本系统没有保存 id_token,也就没有 `id_token_hint`。如果要免确认,需要在会话里保存 id_token,本次不做,已写进 verify。
