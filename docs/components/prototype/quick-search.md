# RpQuickSearch

搜索注入的原型页面，并通过回调跳转。支持 ⌘ P、方向键、Enter 和 Esc。

## 交互预览

点击搜索按钮，输入“示例”。空数据状态显示无结果；演示状态中的“已完结 / 禁用”用于模拟 locked，实际锁定条件由调用方决定。

<ClientOnly><PrototypeComponentsDemo component="quick-search" /></ClientOnly>

## 接入

```tsx
import { RpQuickSearch } from "@weiran-tech/prototype";

<RpQuickSearch pages={searchPages} onNavigate={navigate} locked={locked} />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `pages` | `SearchPage[]`，包含 id、title、path、platform、keywords |
| `onNavigate` | 选择页面后的路径回调 |
| `locked` | 可选；为 true 时隐藏入口，禁止快捷键打开 |
