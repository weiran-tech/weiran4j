# RpUpdatedAt

展示调用方提供的原型内容更新时间。时间由源码或构建维护。

## 交互预览

示例显示固定时间，不读取业务服务或本地修改时间。

<ClientOnly><PrototypeComponentsDemo component="updated-at" /></ClientOnly>

## 接入

```tsx
import { RpUpdatedAt } from "@weiran-tech/prototype";

<RpUpdatedAt updatedAt="2026-11-26T12:00:00+08:00" />
```

## 参数

| 参数 | 说明 |
| --- | --- |
| `updatedAt` | 有效 ISO 日期时间，必填 |
| `timeZone` | 时区，默认 `Asia/Shanghai` |
