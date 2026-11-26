# RpPageDirectory

按模块展示页面、CHG 和可用入口，内置关键词与模块筛选。

## 交互预览

输入页面名或编号筛选；空数据显示无匹配提示。未提供 href 时展示 unavailable，避免把历史页面指向当前实现。

<ClientOnly><PrototypeComponentsDemo component="page-directory" /></ClientOnly>

## 接入

```tsx
import { RpPageDirectory } from "@weiran-tech/prototype";

<RpPageDirectory version={release.id} pages={directoryPages} full={true} />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `version` | 版本编号 |
| `pages` | `DirectoryPage[]`：id、title、path、module、changes；可选 href、removed、unavailable、onDetails |
| `full` | 是否展示完整产品目录标题 |
| `filters / entries / scopeControls / feedback` | 可选插槽：额外筛选、入口、范围切换和状态反馈 |
