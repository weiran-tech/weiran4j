# RpEntry

为管理端、手机端及改动目录提供统一的图标入口。

## 交互预览

点击仅展示导航目标，不离开文档。真实项目应提供可访问地址；组件不判断目标是否存在。

<ClientOnly><PrototypeComponentsDemo component="entry" /></ClientOnly>

## 接入

```tsx
import { RpEntry } from "@weiran-tech/prototype";

<RpEntry kind="manage" to="/manage" onNavigate={navigate}>访问管理端</RpEntry>
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `kind` | `manage` / `mobile` / `changes` |
| `to` | 目标地址，必填 |
| `children` | 入口文本 |
| `onNavigate` | 可选导航回调；普通点击由回调接管，修饰键点击仍保留链接行为 |
