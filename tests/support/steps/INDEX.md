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

| `api/read.ts` | 核心分页/树/详情、地区公开及后台读取 | 登录审计，业务只读 |
| `api/identity.ts` | 用户/角色/菜单临时生命周期及冲突 | 仅本次资源，私有清单清理 |
| `api/platform.ts` | 字典/配置临时生命周期及公开边界 | 仅本次资源，私有清单清理 |
| `api/permissions.ts` | 临时账号授权/拒绝/同会话撤权 | 临时角色/用户，引用既有权限只读 |
