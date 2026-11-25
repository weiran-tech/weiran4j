# 演示开发约定

交互演示与业务应用放在同一个仓库，统一在 `docs/examples/` 维护。修改真实组件时可在同一次提交中同步演示；下游部署后台或使用组件包时无需携带演示源码。

## 目录与依赖

```text
docs/
  examples/              # React 场景、模拟数据、状态切换与演示样式
  .vitepress/theme/      # 文档主题与 Vue/React 挂载入口
  components/            # 组件说明与预览页面
  page-states.md         # 页面状态演示入口
packages/
  manage/                # 实际业务页面与后台组件
  semi-components/       # 可复用组件包
```

依赖方向为 `docs/examples → packages`。业务应用和组件包不导入演示；模拟状态、虚构数据和演示专用控制栏不进入业务组件。演示直接复用实际组件与 hook，避免复制一份实现后与业务行为脱节。

需要复用业务页面的一部分时，业务目录导出职责明确的字段或呈现组件；演示提供本地数据和动作。不要在实际组件中加入 `demo` 分支。

## 现有入口

| 演示 | 源码入口 | 文档入口 |
| --- | --- | --- |
| 公共组件、上传与富文本 | `ComponentGalleryReact.tsx` | [组件总览](/components/) |
| 页面反馈、权限、布局、失败恢复与关闭保护 | `PageStateDemoReact.tsx` 及其场景模块 | [页面状态](/page-states) |
| 短信模板变量插入 | `SmsTemplateDemoReact.tsx` | [系统配置](/configuration) |

场景专用样式与场景放在同一目录，并通过演示根类名限定作用范围。文档主题只注册挂载组件，在 `ClientOnly` 中按需加载 React 场景，卸载时清理 React root、监听器和临时资源。

## 新增与验证

1. 在本目录增加场景，复用实际组件，注入本地数据或模拟动作。
2. 按组件能力展示正常、加载、成功空结果、首次失败、缓存失败与重试、禁用和权限变化。模拟保存应明确标注，不提示已写入数据库。
3. 上传示例使用浏览器临时 URL，离开后释放；演示不依赖登录、真实业务接口或生产数据。
4. 页面状态场景在 `page-state-scenes.ts` 登记导航，再新增 `docs/page-states/<场景>.md`，通过 `<PageStateDemo scene="场景" />` 独立挂载；后台页面示例对应 `backoffice-pages.ts`、`docs/backoffice-examples/<页面>.md` 与 `<BackofficeDemo page="页面" />`。它们共用“演示”入口下的两组侧栏，不再加入场景或页面下拉框。其他演示优先复用现有挂载器，确需新挂载协议时才增加主题中的 Vue 组件。
5. 执行 `pnpm build:docs`，它会先检查演示的 TypeScript 类型再构建文档；如果修改了业务组件，同时执行其适用的 lint、测试和构建。浏览器中检查交互及宽窄屏表现。

本地启动：`pnpm dev:docs`，访问 `http://localhost:5209`。演示无需启动后端。

## 后台示例已拆离

七类原后台示例已移入本目录的 `backoffice/`，统一通过[后台页面示例](/backoffice-examples)访问。它们复用实际组件，使用隔离的 QueryClient、本地字典和上传配置；配置保存只在当前页面生效，上传使用浏览器临时 URL。

业务后台已恢复历史 `pages/demo/` 和序号示例 hook，可选后端 `weiran-demo` 仅在 local/test 装配，提供真实 Excel/ZIP 处理器与序号接口，集成测试复用同一模块，普通生产 bootJar 不包含演示模块。批处理工作台通过可注入的 `BatchJobDataSource` 复用；文档不请求业务接口。

已发布的 Flyway 文件原样保存在应用 `db/app-demo`，仍仅 local/test 加载，避免已有数据库校验失败。新迁移清理旧菜单 id 14–22、`system.demo.*` 配置及旧结果表；不删除曾上传到资源库的真实文件。可选演示模块通过 `db/demo-runtime` 追加迁移恢复菜单 id 14–22、演示配置与 `demo_batch_item`，local/test 使用同一结果表验证真实处理器；历史测试夹具迁移保留，不再维护重复 Java 处理器。

下游仅部署后台可省略整个 `docs/`，无需再清理示例页面或演示模块。`demo-v*` 发布流程保留为后台体验镜像，发布物不包含测试夹具或业务示例。
