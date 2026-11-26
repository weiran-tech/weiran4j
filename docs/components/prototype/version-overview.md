# RpVersionOverview

展示固定基线、说明日期、改动页数与变动项数。

## 交互预览

空数据状态将计数置零。概览直接显示传入数据，不自行统计。

<ClientOnly><PrototypeComponentsDemo component="version-overview" /></ClientOnly>

## 接入

```tsx
import { RpVersionOverview } from "@weiran-tech/prototype";

<RpVersionOverview baseline="v1.0" date="2026-11-26" pages={2} changes={3} />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `baseline` | 基线内容，支持 ReactNode |
| `date` | 说明日期文本 |
| `pages` | 改动页面数量 |
| `changes` | 变动项数量 |
