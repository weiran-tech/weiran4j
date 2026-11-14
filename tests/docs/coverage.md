# 覆盖范围与结果边界

## 已登记流程

| 稳定 ID | 运行器 | 观察范围 |
|---|---|---|
| system/health | Playwright API | 公开存活 HTTP 200 / 数字 code 0 / UP |
| system/access-boundary | Playwright API | 本人、授权快照、登出的匿名 401 / 100101 |
| system/login-entry | Playwright E2E | 受保护路由跳登录、密码入口、同源代理 |
| system/admin-session | Playwright API | Cookie 登录、远端主体、授权快照、CSRF 拒绝、正常清理 |
| system/admin-browser | Playwright E2E | 表单登录、隔离缓存复用、主体/授权快照、Cookie 与缓存清理 |
| system/health-manual | Bruno | 公开存活 |
| system/access-manual | Bruno | 本人读取的匿名拒绝 |

## 验证类型

- 离线检查：流程/类型/发现/Bruno 语法及框架/系统步骤单测，无真实业务账号或服务。
- 合成浏览器：真实 Chromium + 随机本地 HTTP 服务，覆盖实际 CLI、七条系统流程、Cookie/CSRF、HttpOnly、缓存复用、失败清理与多页面资源回收；不代表真实业务通过。
- 真实系统：需操作者启动本项目服务并提供专用密码账号；没有实际执行报告就不能写为已通过。迁移源项目的历史通过结论不继承。

具体本次执行结果和证据见相应 OpenSpec change 的 exec/verify.md；当前没有从源项目迁入真实运行证据或真实会话。缺真实前提时仅记录未运行，不能将合成报告归类为真实成功。

## 真实边界

健康接口只证明存活，不能证明数据库等依赖健康。普通登出不会吊销旧 JWT：验证 Cookie/本地缓存移除与匿名拒绝，不通过改密/禁用/递增版本伪造清理；JWT 按原 TTL 到期。真实登录/退出会留下审计日志。

未覆盖：完整受限角色矩阵、短信/MFA/SSO、对象存储上传及业务 CRUD。当前项目没有合同/返利/STS 的对应流程，未注册这些源业务用例。未来需要新增时应先建立实际业务能力、专用数据/角色前提和可验证清理，不复制阻塞占位冒充覆盖。
