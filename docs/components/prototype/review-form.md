# RpReviewForm

新增、编辑和删除评审，支持建议人选择 / 新建、多图上传与粘贴。

## 交互预览

正常状态可填写并保存；已完结版本禁止写入；失败状态保留输入，可切回正常重试。示例数据仅在当前页面内存中保存，刷新即清空。

<ClientOnly><PrototypeComponentsDemo component="review-form" /></ClientOnly>

## 接入

```tsx
import { RpReviewForm } from "@weiran-tech/prototype";

<RpReviewForm version={release} pages={pages} actions={actions} authorsStore={authorsStore} />
```

代码中的版本、页面、状态或适配器由调用方提供，完整初始化见[模型、存储与导出](./core)。

## 参数

| 参数 | 说明 |
| --- | --- |
| `version / pages` | 版本及可评审页面 |
| `actions` | addReview、updateReview、deleteReview 存储动作 |
| `authorsStore` | 建议人适配器，由 createReviewAuthors 创建 |
| `initialNote / initialPage` | 可选编辑记录或默认页面 |
| `onSaved / onDeleted` | 可选保存、删除完成回调 |
