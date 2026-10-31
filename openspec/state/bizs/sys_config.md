# sys_config 系统配置

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `server/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`ConfigController.java`](../../../server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/platform/adapter/backend/ConfigController.java)、
> [`SaveConfigRequest.java`](../../../server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/platform/adapter/backend/request/SaveConfigRequest.java)、
> [`ConfigApplicationService.java`](../../../server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/platform/application/config/ConfigApplicationService.java)、
> [`SystemConfig.java`](../../../server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/platform/domain/config/SystemConfig.java) /
> [`ConfigType.java`](../../../server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/platform/domain/config/ConfigType.java)、
> [`JacksonJsonSyntax.java`](../../../server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/platform/infrastructure/json/JacksonJsonSyntax.java)、
> [`MybatisConfigRepository.java`](../../../server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/platform/infrastructure/persistence/MybatisConfigRepository.java)、
> [`V202609260101__platform_init_schema.sql`](../../../server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/platform/V202609260101__platform_init_schema.sql) /
> [`V202609260102__platform_seed_data.sql`](../../../server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/platform/V202609260102__platform_seed_data.sql)、
> [`ConfigsPage.tsx`](../../../backend/src/pages/system/configs/ConfigsPage.tsx)（系统配置页面）、
> [`SmsConfigsPage.tsx`](../../../backend/src/pages/system/sms/SmsConfigsPage.tsx)（独立短信配置页面）、
> [`SystemConfigGroupForm.tsx`](../../../backend/src/components/SystemConfigGroupForm.tsx)（共享动态配置表单）、
> [`hooks/queries/configs.ts`](../../../backend/src/hooks/queries/configs.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_config` |
| 菜单 | 系统管理 › 系统配置（`sys_menu.id = 8`）；短信配置（id 12）；文件系统（id 13）的「上传配置」Tab |
| 路由 | `/system/configs` |
| 页面组件 | `system/configs/ConfigsPage`（同文件内的 `ConfigFormModal`） |
| 后端模块 | `weiran-system`；`ConfigController` → `ConfigApplicationService` → `MybatisConfigRepository` |
| 接口前缀 | `/api-backend/system/config`；具体 HTTP 接口以 Springdoc OpenAPI 为准 |
| 权限码 | `system:config:list` · `system:config:create` · `system:config:update` · `system:config:delete`；`GET /public/{key}` 为 `@PublicApi`（免登录） |
| 种子 | `system.general.title` = `Weiran Admin`（`config_system/general`，string，内置）；`system.user.enable_phone_login` = `false`（`config_system/user`，boolean，内置）；`system.upload.*` 六项（`config_system/upload`，内置，图片、视频和普通文件各有格式与大小限制）；`sms.general.sign_name`（`config_sms/general`）、`sms.system_tpl.captcha_local`、`sms.system_tpl.captcha_aliyun`（`config_sms/system_tpl`，string，内置，默认空）；`config_system` 含 `general`、`user`、`upload`，`config_sms` 含 `general`、`system_tpl` |

## 1. 可视化表单

系统配置与短信配置共用 `ConfigsPage` 的左侧分组导航、右侧动态表单和配置项管理；短信菜单通过轻量入口传入 `config_sms`，系统配置使用 `config_system`。上传配置由资源管理内的独立 Tab 维护，系统配置页不展示 `upload` 分组；演示专用 `demo` 分组仅在 `/demo/config` 使用，也不在系统配置页展示。演示表单的各组示例值合并保存在 `system.demo.samples` JSON 配置中，刷新后从数据库恢复。三者复用 `sys_config`/`sys_group`。短信签名存放于短信域的 `general` 组，验证码模板存放于 `system_tpl` 组。
分组由共享分组数据表承载，可供后续模块复用；左栏菜单支持刷新、新增分组，分组条目显示创建时间和内置状态并提供编辑/删除操作。右侧配置详情只展示当前分组名称，不显示创建时间、内置或可删除状态。新增配置项默认使用当前选中分组。
配置项可在已有分组中新增、编辑和删除（内置项仍不可删除）。
右侧分组标题与新增配置项按钮共用标题行，标题只显示当前组名；配置字段标题显示说明及内置标签，不单独显示配置键。设置图标紧随必填标记，在标题悬停或聚焦时绝对定位出现，不占用标题前的空间；编辑弹窗内删除按钮始终显示，无删除权限或内置项时置灰。

配置分组目录和配置项通过 Springdoc OpenAPI 发布；系统配置路由遵循 `/api-backend/system/config/{action}`。

每条配置项通过 `group_key`、`field_type`、`field_options`、`required` 描述分组、控件和校验规则。
键遵循 `{range}.{group}.{value}`，其中 `range=system/sms`、`group` 与所属分组编码一致；匿名读取仅允许 `system.general.title`。

## 2. 配置字段

| 字段 | 控件 | 校验 | DB 列 / 类型 |
| --- | --- | --- | --- |
| 配置键 | 输入；内置项不可改 | 必填、最多 128 字符、`{range}.{group}.{value}`；新建及改键/改组时校验分组一致；重复 100003；内置项改键 100004 | `config_key varchar(128)` 唯一 |
| 分组 | 从启用的配置分组选择 | 必须是 `sys_group` 中已启用且 `type=config`、`group_key` 与配置键前缀对应的编码 | `group_key varchar(64)` |
| 表单字段 | 单行 / 多行 / 数字 / 开关 / 下拉 / JSON / 单文件 / 单图 / 视频 / 多文件 / 富文本 | 字段类型与值类型匹配；下拉选项为合法 JSON 数组；上传类型可在 `field_options` 中配置 `image`、`video`、`file` 的数组组合；单文件、单图和视频保存资源 URL，多文件保存最多 9 个 URL 的 JSON 数组，富文本保存 HTML | `field_type varchar(16)`、`field_options varchar(2048)` |
| 必填 | 开关 | 必填项不可为空 | `required tinyint(1)` |
| 类型 | 随控件设置 | 只能 `string/number/boolean/json` | `config_type varchar(16)` 默认 `string` |
| 配置值 | 由 `field_type` 渲染 | 最多 65535 字符，并按类型校验（见下） | `config_value mediumtext` 默认由应用层提供 |
| 描述 | 多行输入 | 最多 256 字符 | `description varchar(256) null` |

**按类型校验的口径**：

| 类型 | 前端校验 | 后端校验 |
| --- | --- | --- |
| string | 不校验 | 不校验 |
| number | 去空白后非空，且 `Number(v)` 不是 `NaN` | 非空白、**首尾不能有空白**、`new BigDecimal(v)` 可解析 |
| boolean | 严格等于 `true` / `false` | 严格等于 `true` / `false` |
| json | `JSON.parse` 成功 | 非空白，Jackson `readTree` 成功且开启 `FAIL_ON_TRAILING_TOKENS` |

`is_builtin` 只能由种子写入；审计列自动填充。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增配置 | `POST /api-backend/system/config/create` → `{id}` | `system:config:create` | ✅ 系统配置 / 新增配置 | 见 §2 |
| 新增配置分组 | `POST /api-backend/system/config/createGroup` → `{id}` | `system:config:create` | ✅ 系统配置 / 新增配置分组 | 编码须匹配 `[a-z][a-z0-9_-]*` 且不得重复；持久化为启用的 `type=config` 组 |
| 编辑配置分组 | `PUT /api-backend/system/config/updateGroup/{key}` | `system:config:update` | ✅ 系统配置 / 修改配置分组 | 只修改名称，编码不变；停用或不存在的组返回 404 |
| 删除配置分组 | `DELETE /api-backend/system/config/deleteGroup/{key}` | `system:config:delete` | ✅ 系统配置 / 删除配置分组 | 仅允许删除空的自定义分组；内置分组或仍有配置项时 100004 |
| 编辑配置 | `PUT /api-backend/system/config/update/{id}` | `system:config:update` | ✅ 修改配置 | 404 配置不存在；内置项改键 100004；新值按新类型校验 |
| 删除配置 | `DELETE /api-backend/system/config/delete/{id}` | `system:config:delete` | ✅ 删除配置 | 内置 100004「内置配置不可删除」 |
| 公开读取 | `GET /api-backend/n/system/config/getPublic/{key}` | 免登录 | — | 键不是 `system.general.title` 100102「该配置不允许公开读取」；查不到 100002；按库里的真实键复核 |
| 详情 | `GET /api-backend/system/config/get/{id}` | `system:config:list` | — | 页面未调用 |

## 4. 用到的公共组件

- `NavListPanel` / `NavListItem`（左栏）、`SystemConfigGroupForm`（分组动态配置表单）、`FileUpload`、`RichTextEditor`、`PageContainer`、`Permission`、Semi UI `Form`

## 5. 说明与建议

- 配置写入后没有缓存层，公开接口每次查库。
- 配置保存和删除时，在同一事务同步替换 `sys_media_reference` 中的 `system_config` 引用；资源库仍通过实时检查器核对历史配置值。
- 业务模块可调用 `ConfigService.createBusiness(namespace, command)` 创建业务键，并调用 `updateBusinessValue(namespace, key, value)` 原位改值；业务键限三级小写结构，保留 `system`、`sms` 命名空间。创建时检查启用的 `config_system` 分组、值类型和字段定义，更新时锁定原记录并复用值校验，只写 `config_value` 与媒体引用。业务接口负责权限，不另开放 system HTTP 路由。
- 系统配置页面按 `sys_group(type=config,group_key=config_system)` 分组并排除 `upload`；资源管理的上传配置 Tab 编辑 `system.upload.*` 六项；短信页面按 `group_key=config_sms` 分组。配置键遵循 `{range}.{group}.{value}`，其中 `range=system/sms`、`group=sys_config.group_key=sys_group.code`；新建或变更键、分组时校验。已有不合规的自定义键允许原位改值。`field_type`、`field_options`、`required` 控制表单渲染和校验。匿名读取仅允许 `system.general.title`。
- 短信配置由 `/system/sms` 菜单进入共用的 `ConfigsPage`，传入 `config_sms` 后只呈现短信域分组及 `sms.*` 配置项：`sms.general.sign_name` 位于 `general` 组，`sms.system_tpl.captcha_local` 与 `sms.system_tpl.captcha_aliyun` 位于 `system_tpl` 组。分组与配置项管理共用同一页面流程，分组写接口按配置域定位。
- 登录页通过公开 `/api-backend/n/system/auth/listProviders` 获取手机号登录状态；后端只有在 `system.user.enable_phone_login=true`、短信发送模式可用且当前模式的验证码模板有效时才返回 `phoneLoginEnabled=true`。`local` 模式的 `sms.system_tpl.captcha_local` 是短信正文，必须包含 `${code}`；发码时替换并写入应用日志。`aliyun` 模式的 `sms.system_tpl.captcha_aliyun` 是已审核模板 CODE。
- 站点标题仍取自构建期环境变量 `VITE_APP_TITLE`（见 #02）；`backend/src` 不直接调用公开配置接口。
- 内置配置只保护「键不可改、不可删」，值与表单配置都可以改。
- [系统配置说明](../../../docs/configuration.md)记录了分组和表单字段的使用方式。

## 6. 已知问题汇总

- **#01 🔴 P3 前端 number 校验比后端宽，部分值要提交后才被拒**
  前端用 `Number(v)` 判断：`' 12 '`、`'0x10'`、`'Infinity'`、`'1e3 '` 这类值能通过；后端要求首尾无空白且
  `new BigDecimal(v)` 可解析，这四个值都会被拒。症状：表单校验通过，提交后 Toast 显示 100001
  「configValue: 不是合法的 number 值」。

- **#02 🔴 P3 种子配置 `system.general.title` 前端仍未读取**
  `GET /api-backend/n/system/config/getPublic/{key}` 为其开放免登录读取；
  但前端 `config.ts` 的 `appTitle` 来自 `import.meta.env.VITE_APP_TITLE`（缺省 `Weiran Admin`），全仓无调用公开配置接口之处。
  症状：在系统配置页修改 `system.general.title` 后，登录页与顶栏标题不变。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-31**
- 文件上传组件支持图片、视频、普通文件三种上传类型及其组合，分别按后台设置限制格式与大小；单图字段不再接受视频，视频字段使用独立的视频上传类型；上传组合演示加入图片＋视频入口。
- `/demo/config` 的「保存本组」改为写入 `system.demo.samples`，刷新后从数据库恢复示例值；移除容易误导的「真实配置」重复表单。
- 系统配置页隐藏演示专用 `demo` 分组；保留其数据供 `/demo/config` 使用。
- `/demo/config` 新增「上传组合」分组，在同一表单展示单文件、多文件、单图、视频和富文本上传；视频示例复用单文件控件，原有单组件与特殊验证分组保持不变。
- `/demo/config` 改为按字段类型分别展示组件，额外提供「特殊验证」分组；各组可切换只读状态。
- 上传规则移到资源管理的「上传配置」Tab；图片、视频、普通文件分别配置支持格式与大小上限，系统配置页不再展示上传分组。

**2026-10-30**
- 演示配置 `system.demo.images` 的字段类型改为 `files`；系统配置页与 `/demo/config` 共用多文件上传字段，保存 URL 数组，旧 `json` 演示记录在迁移前也能显示上传控件并按原类型保存。
- 上传设置中的视频大小上限提高到 1024 MB，默认仍为 100 MB；图片大小上限保持 100 MB。
- 新增上传设置分组；图片格式使用多选，图片和视频大小用 MB 数字输入，文件格式用逗号分隔输入。资源上传从配置读取规则并在服务端校验，富文本支持视频上传和插入。

**2026-10-27**
- 业务命名空间可经 `ConfigService` 创建和更新 `sys_config`，共享值校验与媒体引用事务；系统管理界面的 `system.` / `sms.` 创建规则保持独立。

**2026-10-22**
- 图片上传入口改为与缩略图等尺寸并列；缩略图按长边等比适配，多图支持拖动和前后按钮排序，预览支持缩放。
- 文件配置字段接入通用 `FileUpload`，支持拖放、预览和失败重试；富文本字段接入通用 `RichTextEditor`，支持粘贴图片、多图上传、引用、撤销和重做。上传中禁用本组保存；配置值扩至 65535 字符，数据库字段改为 `mediumtext`。

**2026-10-21**
- `local` 验证码模板按 `${code}` 等参数渲染短信正文并记录日志；本地模板缺少 `${code}` 时手机号登录不可用。
- 将内置标题键迁至 `system.general.title` 和 `general` 组；移除系统配置的 `site` 组，并将该组中其他已有配置移入 `general`。公开读取仅允许标题键。
- 约定配置键为 `{range}.{group}.{value}`；追加迁移使短信内置键带上分组段，并将 `system.site.title` 归入 `site` 组；新建和变更键/分组时校验。
- 新增独立菜单「短信配置」及 `/system/sms` 入口；两处菜单共用参数化的 `ConfigsPage`，按配置域隔离分组和配置项。短信域按 `general`、`system_tpl` 分组展示签名与本地/阿里云模板三个字段，并将旧手机号登录模板键迁入本地短信配置。
- 配置表单新增单图上传与富文本字段。单图复用系统媒体上传并保存图片 URL；富文本保存 HTML，均按 string 类型校验。

**2026-10-20**
- 新增内置配置 `system.user.phone_login_sms_template_code`，用于配置已审核的手机号登录验证码短信模板 CODE；手机号登录需同时启用开关、短信发送器和模板 CODE。
- 配置组改为复用 `sys_group(type=config)`，页面改为左侧导航与右侧动态表单；左栏支持刷新、新增、编辑和删除，展示创建时间、内置及可删除状态；右栏标题显示当前组名、创建时间、内置和可删除状态，不展示说明，新增配置项默认当前组；配置 action 路由统一放在 `/api-backend/system/config/{action}`。内置分组和仍有配置项的分组不可删除。配置项标题隐藏配置键并显示内置标签，设置图标紧随必填标记并在悬停时显示；编辑弹窗删除按钮始终显示，不可删除时置灰。新增配置项按钮带图标并置于标题行右侧。

**2026-10-19**
- 新增 `user` 内置分组与 `system.user.enable_phone_login` 开关（默认关闭）。
- 系统配置改为按固定内置分组目录渲染动态表单，配置键统一使用 `system.`；站点配置独立模块已移除。

**2026-09-27**
- **#04 ✅ P3 系统配置列表按 `rules/advisory/list-view.md` 约定改造**
  「新增配置」移到工具栏最左；操作列（编辑 / 删除）改用 `TableActions`，窄屏（< 992px）收成「…」；加刷新按钮与「已选条件」（关键字）。

**2026-09-26**
- **#03 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_config` 的列表、表单、公开读取与已知问题。
