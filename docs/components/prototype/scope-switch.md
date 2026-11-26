# RpScopeSwitch

将全部产品和版本改动作为受控范围切换。管理端通常放在侧栏 Logo 下方。

## 交互预览

点击切换可观察当前值。组件只维护交互呈现，不修改页面或版本数据。

<ClientOnly><PrototypeComponentsDemo component="scope-switch" /></ClientOnly>

## 接入

```tsx
import { RpScopeSwitch } from "@weiran-tech/prototype";

<RpScopeSwitch value={scope} onChange={setScope} />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `value` | `"all"` 或 `"version"`，当前范围 |
| `onChange` | 范围切换回调；调用方同步路由或筛选条件 |
