# sys_config 系统配置

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`ConfigController.java`](../../../weiran4j/weiran-platform/weiran-platform-adapter/src/main/java/com/weiran/platform/adapter/web/ConfigController.java)、
> [`SaveConfigRequest.java`](../../../weiran4j/weiran-platform/weiran-platform-adapter/src/main/java/com/weiran/platform/adapter/web/request/SaveConfigRequest.java)、
> [`ConfigApplicationService.java`](../../../weiran4j/weiran-platform/weiran-platform-application/src/main/java/com/weiran/platform/application/config/ConfigApplicationService.java)、
> [`SystemConfig.java`](../../../weiran4j/weiran-platform/weiran-platform-domain/src/main/java/com/weiran/platform/domain/config/SystemConfig.java) /
> [`ConfigType.java`](../../../weiran4j/weiran-platform/weiran-platform-domain/src/main/java/com/weiran/platform/domain/config/ConfigType.java)、
> [`JacksonJsonSyntax.java`](../../../weiran4j/weiran-platform/weiran-platform-infrastructure/src/main/java/com/weiran/platform/infrastructure/json/JacksonJsonSyntax.java)、
> [`MybatisConfigRepository.java`](../../../weiran4j/weiran-platform/weiran-platform-infrastructure/src/main/java/com/weiran/platform/infrastructure/persistence/MybatisConfigRepository.java)、
> [`V202609260101__platform_init_schema.sql`](../../../weiran4j/weiran-platform/weiran-platform-infrastructure/src/main/resources/db/migration/platform/V202609260101__platform_init_schema.sql) /
> [`V202609260102__platform_seed_data.sql`](../../../weiran4j/weiran-platform/weiran-platform-infrastructure/src/main/resources/db/migration/platform/V202609260102__platform_seed_data.sql)、
> [`ConfigsPage.tsx`](../../../web/src/pages/system/configs/ConfigsPage.tsx)（页面、内嵌 `ConfigFormModal` 与 `validateConfigValue`）、
> [`hooks/queries/configs.ts`](../../../web/src/hooks/queries/configs.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_config` |
| 菜单 | 系统管理 › 系统配置（`sys_menu.id = 8`） |
| 路由 | `/system/configs` |
| 页面组件 | `system/configs/ConfigsPage`（同文件内的 `ConfigFormModal`） |
| 后端模块 | `weiran-platform`；`ConfigController` → `ConfigApplicationService` → `MybatisConfigRepository` |
| 接口前缀 | `/api/configs` |
| 权限码 | `system:config:list` · `system:config:create` · `system:config:update` · `system:config:delete`；`GET /public/{key}` 为 `@PublicApi`（免登录） |
| 种子 | `sys.site.title` = `Weiran Admin`（string，内置） |

## 1. 列表

接口 `GET /api/configs`，按 `id` 升序；无排序参数。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 配置键 | `config_key` | 可复制文本；内置项追加蓝色「内置」`Tag` |
| 2 | 配置值 | `config_value` | 单行省略，悬停显示全文 |
| 3 | 类型 | `config_type` | 原值（`string/number/boolean/json`） |
| 4 | 描述 | `description` | 空值 `—` |
| 5 | 更新时间 | `updated_at` | 原值 |
| 6 | 操作 | — | 有 `update` / `delete` 任一权限才出现 |

**筛选项**：输入框「配置键 / 描述」→ `keyword`（`config_key`、`description` 两列 `LIKE`），「查询」/ 回车生效，「重置」清空。

**分页**：`page` 默认 1、`pageSize` 默认 20（上限 200）；前端可切换条数、显示总数。

## 2. 字段与表单

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 配置键 | `Form.Input`，内置项 `disabled`；提交前 `trim` | 必填；`maxLength=128` | `@NotBlank` `@Size(max=128)`；去空白后查重 40900「配置键已存在」；内置项改键 40901；无格式规则 | `config_key varchar(128)` 唯一 |
| 类型 | `Form.Select`（字符串 / 数字 / 布尔 / JSON），默认 `string` | 无 | `@NotBlank`；只能 `string/number/boolean/json`（40000）；内置项也可改类型 | `config_type varchar(16)` 默认 `string` |
| 配置值 ❌ | `Form.TextArea`（4 行） | `maxLength=4096`；`validateConfigValue` 按类型校验（见下） | `@NotNull` `@Size(max=4096)`（可为空串）；领域 `ConfigType.validate` 按类型校验，不合法 40000 `configValue: 不是合法的 <type> 值` | `config_value varchar(4096)` 默认 `''` |
| 描述 | `Form.TextArea`（2 行） | `maxLength=256` | `@Size(max=256)`；空白存 `null` | `description varchar(256) null` |

**按类型校验的口径**：

| 类型 | 前端 `validateConfigValue` | 后端 `ConfigType.validate` |
| --- | --- | --- |
| string | 不校验 | 不校验 |
| number | 去空白后非空，且 `Number(v)` 不是 `NaN` | 非空白、**首尾不能有空白**、`new BigDecimal(v)` 可解析 |
| boolean | 严格等于 `true` / `false` | 严格等于 `true` / `false` |
| json | `JSON.parse` 成功 | 非空白，Jackson `readTree` 成功且开启 `FAIL_ON_TRAILING_TOKENS` |

`is_builtin` 只能由种子写入；审计列自动填充。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增配置（工具栏） | `POST /api/configs` → `{id}` | `system:config:create` | ✅ 系统配置 / 新增配置 | 见 §2 |
| 编辑（行） | `PUT /api/configs/{id}` | `system:config:update` | ✅ 修改配置 | 404 配置不存在；内置项改键 40901；新值按新类型校验 |
| 删除（行，`Popconfirm`） | `DELETE /api/configs/{id}` | `system:config:delete` | ✅ 删除配置 | 内置 40901「内置配置不可删除」（前端按钮 disabled） |
| —（公开读取） | `GET /api/configs/public/{key}` | 免登录 | — | 键不以 `sys.site.` 开头 40300「该配置不允许公开读取」；查不到 40400；因库排序规则大小写不敏感，查回后用库里的真实键再判一次前缀 |
| —（详情） | `GET /api/configs/{id}` | `system:config:list` | — | 前端页面未调用 |

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`、`Permission`

## 5. 说明与建议

- 配置写入后没有缓存层，公开接口每次查库。
- **前端目前不消费任何配置**：`web/src` 里没有调用 `/api/configs/public/*` 的代码，站点标题取自构建期环境变量 `VITE_APP_TITLE`（见 #02）。
- 内置配置只保护「键不可改、不可删」，值与类型都可以改（例如把 `sys.site.title` 的类型改成 `number` 并填数字）。
- 建议：前端 number 校验与后端对齐（#01）；登录页 / 顶栏改读 `sys.site.title`，或修改种子描述（#02）。

## 6. 已知问题汇总

- **#01 🔴 P3 前端 number 校验比后端宽，部分值要提交后才被拒**
  前端用 `Number(v)` 判断：`' 12 '`、`'0x10'`、`'Infinity'`、`'1e3 '` 这类值能通过；后端要求首尾无空白且
  `new BigDecimal(v)` 可解析，这四个值都会被拒。症状：表单校验通过，提交后 Toast 显示 40000
  「configValue: 不是合法的 number 值」。

- **#02 🔴 P3 种子配置 `sys.site.title` 描述称用于前端登录页与顶栏，但前端并未读取**
  种子描述写「站点标题（前端登录页与顶栏展示）」，`GET /api/configs/public/{key}` 也专为它开放免登录读取；
  但前端 `config.ts` 的 `appTitle` 来自 `import.meta.env.VITE_APP_TITLE`（缺省 `Weiran Admin`），全仓无调用公开配置接口之处。
  症状：在系统配置页修改 `sys.site.title` 后，登录页与顶栏标题不变。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-09-26**
- **#03 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_config` 的列表、表单、公开读取与已知问题。
