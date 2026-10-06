# external-identity-login · 验收摘要

**做了什么**:路线图第 2 期,外部身份登录(D-015)。
- 支持 CAS 3.0 和 OIDC(授权码 + PKCE + state + nonce,id_token 经 JWKS 验签);
- 外部身份只按 `sys_user_identity(provider, external_id)` 映射到本地用户,不按用户名关联;
- 开通方式:预先绑定(管理员在用户管理里绑,或用户在个人中心自助绑);按提供方开关可以自动开通,自动开通的用户没有本地密码;
- 密码登录开关,关闭后保留内置超管作为应急入口;
- 登出时可以按配置跳到提供方一并登出;
- 不新增依赖,不引入 Spring Security。

逐条核对与结论见 `exec/verify.md`。

**运行时 / 手工验证**(verify.md 只记了结论,这里记操作):
- 集成测试 `ExternalLoginIT`:
  - Testcontainers 起 `quay.io/keycloak/keycloak:26.0`,导入 `keycloak/weiran-test-realm.json`(alice / bob / carol 三个用户,client `weiran4j`);
  - 进程内用 JDK `HttpServer` 模拟 CAS(ticket 为 `ST-ok-<user>` 时验票成功);
  - 测试手工跟随浏览器跳转:回调地址是配置的公开地址 `http://localhost:5373`,测试把它换成本服务的随机端口;
  - Keycloak 在 http 下也给 Cookie 打 Secure,所以测试手工维护提供方的 Cookie。
- 真实浏览器:
  - 本机执行 `docker run … keycloak:26.0 start-dev --import-realm`(端口 18081),再用 `WEIRAN_AUTH_PROVIDERS_KEYCLOAK_*` 环境变量启动 `pnpm dev`;
  - 在 cmux 浏览器里以 carol 走完「外部登录 → 刷新 → 个人中心 → 登出(跳 Keycloak)」;
  - 验证后已删除自动开通的 carol、停止 dev、删除容器。

**已知缺口**:
- `sys_user.md#10`:启用 SSO 后,用户列表在双列、侧边、混合布局下会横向滚动;
- `sys_user_identity.md#01`:不支持提供方侧发起的单点登出;
- Keycloak 登出多一个确认页(本系统不保存 id_token,没有 `id_token_hint`)。

**交给使用者的注意事项**:
- 接入步骤见 `weiran4j/docs/02-部署.md` §5a:
  1. 设置 `WEIRAN_PUBLIC_BASE_URL`,必须与浏览器地址完全一致;
  2. 在提供方处登记回调地址 `<base>/api/auth/sso/<id>/callback`;
  3. 用环境变量 `WEIRAN_AUTH_PROVIDERS_<ID>_*` 配置提供方。
- 本地已有同名用户**不会**被自动关联,需要管理员手工绑定,或由用户自助绑定。
- 关闭密码登录前,先确认 `admin` 的密码足够强:它是唯一的应急入口。
