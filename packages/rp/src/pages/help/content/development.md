# 本地开发与 Mock

本项目是独立的 pnpm 工作区，仅包含管理端 React + Semi 及同工程内的手机端 Vue + Vant，没有业务后端或数据库。全部命令在本仓库根目录执行。

## 启动和检查

```bash
node scripts/prepare-install.mjs && pnpm install --frozen-lockfile
pnpm dev
```

统一服务 `http://localhost:5208`，原型协作 `/`、管理端 `/manage`、手机端 `/mobile/`，使用指南 `/help`。业务快捷入口进入 `/versions/当前版本/`；本地只运行当前工作版本，历史页面由归档提供。文档随管理端一起开发和构建，不再有单独文档应用或端口。端口占用直接报错。

演示账号 `admin / admin123`，短信验证码固定为 `123456`，不会发送短信。登录和权限仅模拟界面。

```bash
pnpm lint
pnpm test
pnpm build:site
pnpm check:site
```

`VITE_APP_TITLE` 控制管理端标题；主色 `#0064FA`。管理组件从 npm `@weiran-tech/manage`、原型框架从 `@weiran-tech/prototype` 引用，不复制组件包源码。

## 添加和维护页面

| 位置 | 用途 |
| --- | --- |
| `src/pages/` | 管理端页面，保留 main.tsx、登录和管理布局 |
| `src/mocks/seed.ts` | 动态菜单和种子，component 相对 pages、不含扩展名 |
| `src/mocks/transport.ts` | 浏览器数据适配器；新增契约同时补 Mock，未知操作返回明确错误 |
| `src/mobile/` | Vant 手机端原型 |
| `prototype/releases.json` | current、activeVersion 指针 |
| `prototype/versions/<版本>/version.json` | 本版目标、状态、基线等元信息 |
| `prototype/versions/<版本>/changes/<pageId>.json` | 按页面分组的 CHG、规则和验收条件 |
| `src/pages/help/content/` | 使用指南 Markdown，与管理端一起发布 |

新增功能应同步页面、说明及菜单；修改共享版本规则时检查双端行为。新增菜单优先做兼容迁移，保留旧 ID、自定义内容和演示数据。

## 演示数据与重置

Mock 对开发和构建产物均生效，数据保存在浏览器 localStorage。版本说明和评审共享不通过业务 Mock 写入，不提供伪多人协作。

页面重置仅恢复对应的退款或手机演示数据，不清登录、偏好或其他业务表。完整重置会恢复初始 Mock，执行前注意本机编辑内容。切换端口属于新浏览器源，旧端口数据仍保留。

上传保存本地 data URL，不上传服务器；批处理输出固定模拟结果；日志种子不是真实审计。原型的用户、权限、密码和会话不代表真实安全能力。

### 手机端评审布局

手机端 `/versions/<版本>/mobile/#/orders` 沿用 Alang 的展示框架：左侧页面目录和全部产品 / 版本改动切换，中间 Vant 手机设备预览，右侧页面需求、改动、业务规则及场景切换。现有订单、退款与表单业务保持本项目口径；桌面三栏，窄屏纵向排列。`embed=page` 仅展示业务页面，不显示目录、设备边框或评审说明。

### 演示口令存储

原型登录只在浏览器内模拟。口令使用 BCrypt 哈希保存到本机演示库；旧明文缓存读取时迁移，不重置业务数据。不要使用真实账号口令。用户资料或偏好中的明文凭据字段不会持久化。
