# RpPageReview

提供页面评审入口、版本记录面板和评审弹窗。支持 ⌘ J。

## 交互预览

点击新增评审或记录按钮。已完结版本可查看记录，不能新增；空数据模拟当前页面未收录，弹窗会说明原因。文档将浮动入口限制在预览区域，应用内沿用组件默认浮动布局。

<ClientOnly><PrototypeComponentsDemo component="page-review" /></ClientOnly>

## 接入

```tsx
import { RpPageReview } from "@weiran-tech/prototype";

<RpPageReview release={release} page={page} pages={pages} notes={notes} actions={actions} authorsStore={authorsStore} reviewPath="/reviews" />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `release / page / pages` | 版本、当前页面及可评审页面；page 未提供时不渲染 |
| `notes` | 当前版本的记录数组，保存后由调用方刷新 |
| `actions / authorsStore` | 评审动作与建议人适配器 |
| `reviewPath` | 完整评审目录地址 |
| `locked` | 可选；锁定时隐藏入口并停用快捷键 |
