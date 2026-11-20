# 编写流程

先在 [docs/biz](../biz/index.md) 找到业务域及适用项目，确认角色、资源、正常与拒绝场景、真实前提和清理边界，再编写测试。接口定义以所属代码仓库契约为准。

## 新增流程

```bash
pnpm test:flows init domain/example --type api --dry-run
pnpm test:flows init domain/example --type api --title 示例流程
pnpm test:flows step new domain/shared-action --dry-run
```

1. 复用已有流程能力和共享步骤，避免重新实现登录、请求或证据逻辑。
2. 在 plan.md 写清前提、操作、可观察判据、清理和限制。
3. 实现真实请求或页面动作，spec 保留编排和关键断言，共享动作进入 steps。
4. 补齐 flow.json、registry 和步骤 INDEX；参数、预期数量与必要附件精确对应。
5. 执行深度检查、离线回归及相关合成回归，再在前提齐备的环境运行真实流程。
6. 将业务范围和阻塞归入对应业务域；将环境、提交与执行结果留在项目验证记录。

脚手架生成的占位必须失败，不能用恒真断言或跳过标记冒充实现。模板默认空 tags，业务未就绪写 blockedReason。注册后即使阻塞，也要通过源码、类型和用例发现检查。

## 判据与共享代码

API 同时核对 HTTP 状态、项目业务码、返回形状和可观察后置状态。成功码的字符串/数字类型、鉴权与 CSRF 等属于项目契约，不能从另一个项目直接搬用。

合法空结果可以通过，但只能说明空结果契约；非空字段、排序和关联数据需另有数据前提。按钮隐藏不能代替服务端授权，admin 不能代替受限角色。

匿名 fixture、认证 fixture 与 API 资源 fixture 各自承担上下文职责。每个业务用例只登录一次；跨角色使用独立上下文。共享步骤须登记到 INDEX，所有实际间接引用必须与声明一致。

多页面场景使用有界并发、唯一场景名和附件前缀，每页用后关闭。执行失败和关闭失败都应汇总为失败，不并发修改同一业务记录或撤销同一会话。

## 写入与证据

read-only 不改变业务状态；transition 每个用例提供 before-state、after-state、cleanup-state，E2E 另提供明确的前后页面证据。必要附件对应本用例，不能借其他用例的附件过关。

业务写入显式声明写入开关与必要参数，使用所有权清单记录本次资源，在 finally 清理并查询确认。会话退出不等于业务回滚。不可逆动作使用一次性资源，明确 `irreversible=true`、`rollbackPerformed=false` 和最终状态；具体字段是业务证据，不是新增 flow.json 顶层字段。

敏感用例禁用自动 trace、视频和截图，只显式保存非敏感页面与白名单字段。凭据输入和原始认证异常使用固定脱敏错误。资源归属和恢复规则见[资源与恢复](resources.md)。

## Bruno 请求

使用 OpenCollection `.yml`，集合、环境、目录配置和请求分别保存；每请求一个文件，单请求 expectedCases=1。请求声明、计划与元数据共同登记，正式 CLI 注入环境地址。

深度检查应拒绝遗留格式、未登记请求、非法方法及配置/继承脚本语法错误。语法通过不表示请求成功或断言充分；模板保留失败占位。

## 修改与删除

修改时同步计划、预期数量、依赖、必要证据和业务覆盖边界。删除先预览：

```bash
pnpm test:flows remove domain/example --dry-run
pnpm test:flows remove domain/example --yes
```

删除只处理独立流程目录，保留其他流程仍引用的步骤及历史证据，并更新 registry/INDEX。短时锁保护文件更新，普通异常回滚不等于掉电事务；未知遗留锁不自动抢占。
