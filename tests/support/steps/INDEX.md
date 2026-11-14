# 共享步骤索引

| 文件 | 职责 | 副作用 |
|---|---|---|
| `auth/login.ts` | 密码登录表单动作，调用方核验并清理 Cookie 上下文 | 创建登录会话 |
| `system/health.ts` | 公开存活检查，不聚合依赖健康 | 无 |
| `system/access-boundary.ts` | 本人、授权快照、登出的匿名鉴权拒绝 | 无 |
| `system/login-entry.ts` | 登录页、路由守卫与同源代理 | 无业务写入 |
| `system/admin-session.ts` | API Cookie 登录、主体、授权快照、CSRF 与清理 | 登录/退出日志，finally 清理 |
| `system/admin-browser.ts` | 表单登录、Cookie 缓存和独立上下文复用 | 登录/退出日志、私有缓存，finally 清理 |

步骤只返回白名单状态，凭据与完整 Cookie 不进入证据；所有间接步骤须登记于 flow.json。
