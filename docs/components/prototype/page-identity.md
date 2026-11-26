# RpPageIdentity

复制版本、端、页面标题、稳定编号及路径，方便把页面上下文交给 AI。

## 交互预览

点击 TELL AI 复制上下文；浏览器不支持剪贴板或复制被拒绝时显示错误。请在 HTTPS 或 localhost 下体验。

<ClientOnly><PrototypeComponentsDemo component="page-identity" /></ClientOnly>

## 接入

```tsx
import { RpPageIdentity } from "@weiran-tech/prototype";

<RpPageIdentity release={release} page={page} path="/sample" platform="manage" />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `release` | 当前版本 `Release` |
| `page` | 包含 `id` 与 `title` 的页面 |
| `path` | 当前业务路径 |
| `platform` | `manage` 或 `mobile` |
