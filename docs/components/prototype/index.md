# Prototype 组件

`@weiran-tech/prototype` 提供原型协作框架。页面、路由、版本及存储均由调用方提供，组件不包含项目业务。

主入口自动加载样式，无需额外导入 CSS；仅使用模型或 Node 工具时从 `@weiran-tech/prototype/core` 引用。

| 组件 | 用途 |
| --- | --- |
| [RpScopeSwitch](/components/prototype/scope-switch) | 产品范围切换 |
| [RpEntry](/components/prototype/entry) | 原型入口 |
| [RpUpdatedAt](/components/prototype/updated-at) | 更新时间 |
| [RpPageIdentity](/components/prototype/page-identity) | 页面定位 |
| [RpQuickSearch](/components/prototype/quick-search) | 快捷搜索 |
| [RpVersionOverview](/components/prototype/version-overview) | 版本概览 |
| [RpPageDirectory](/components/prototype/page-directory) | 页面目录 |
| [RpReviewForm](/components/prototype/review-form) | 评审表单 |
| [RpPageReview](/components/prototype/page-review) | 页面评审 |

安装版本与依赖见[版本发布](/releases)。所有预览使用真实组件与本地数据；不访问生产服务。

[模型、存储与导出](./core)介绍无 React 的模型入口与本机评审适配。下方为组合示例，逐项说明见左侧组件目录。

<ClientOnly><PrototypeComponentsDemo /></ClientOnly>
