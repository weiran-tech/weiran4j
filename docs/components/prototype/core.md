# 模型、存储与导出

组件包只定义公共交互和数据模型。页面清单、版本、路由、存储键与项目业务由调用方提供。

## 初始化评审适配器

在浏览器挂载后创建适配器；SSR 阶段不读取 localStorage。文档预览使用内存 Storage，真实项目可用独立的 localStorage 键，避免项目间混用。

```ts
import { createReviewStore, createReviewAuthors } from '@weiran-tech/prototype/core';
import type { ProductPage, Release } from '@weiran-tech/prototype/core';

const release: Release = {
  id: 'v1.1', title: '当前原型', status: 'in_progress', baseline: null,
  date: '2026-11-26', goal: '验证页面交互', changes: [],
};
const pages: ProductPage[] = [{
  id: 'sample', title: '示例', path: '/sample', module: '示例模块', platform: 'manage',
}];
const actions = createReviewStore({
  storage: localStorage,
  storageKey: 'my-project:reviews',
  releases: () => [release],
  pagesForReview: () => pages,
  onChange: () => { /* 读取 actions.readPrototype() 后更新界面 */ },
});
const authorsStore = createReviewAuthors(
  localStorage, 'my-project:review-authors', () => actions.readPrototype().notes,
);
```

`RpReviewForm` 和 `RpPageReview` 使用这两个适配器。`onChange` 负责通知外部刷新，组件包不绑定应用的状态管理或路由库。

| API | 行为 |
| --- | --- |
| `createReviewStore` | 返回 readPrototype、addReview、updateReview、deleteReview；写入时检查版本状态、页面归属与图片限制 |
| `createReviewAuthors` | 返回 readReviewAuthors、rememberReviewAuthor；维护最近建议人 |
| `reviewImages` | 兼容旧单图 `image` 与新多图 `images` |
| `legacyNotes` 选项 | 可选旧记录提供器；删除旧记录时以 tombstone 防止再次迁入 |

已完结版本只读。损坏的存储不会被写入覆盖，存储失败会抛出错误；调用方应保留输入并提示恢复，不自动清空用户记录。

## 版本与页面模型

`@weiran-tech/prototype/core` 不导入 React 或样式，适合 Node 工具读取。

| 导出 | 用途 |
| --- | --- |
| `assembleManifest`、`canonicalJson` | 从拆分文件组装版本清单、生成稳定 JSON 文本 |
| `productPages` | 沿版本基线合并完整产品页 |
| `changedPages`、`reviewPages` | 获取变动页及允许评审的页面 |
| `parallelConflicts` | 找出平行版本中的页面冲突 |
| `canReview` | 判断版本是否处于进行中 |
| `detailPath`、`pageHref` | 生成版本详情路径与页面入口；历史入口不可用时返回空值 |
| `platformLabels`、`statusLabels`、`changeLabels` | 管理端 / 手机端、版本状态与变动类型标签 |

公开类型：`Platform`、`ProductPage`、`CatalogPage`、`Change`、`Release`、`ReleaseIndex`、`ReleaseManifest`、`ReviewNote`、`ReviewInput`、`LocalState`、`ReviewStoreOptions`、`ReviewStore`、`ReviewAuthors`、`ReviewAuthorStore`。

UI 入口另外导出 `SearchPage` 和 `DirectoryPage` 类型。页面稳定 ID 应在端内唯一，跨端关联同时使用 platform 与 id。

## 导出评审

以下函数从主入口 `@weiran-tech/prototype` 导入，需在浏览器用户操作中调用。

| API | 用途 |
| --- | --- |
| `groupReviewNotes(pages, notes)` | 按端、模块和页面分组评审 |
| `exportVersion(release, pages, notes, format?)` | 导出单版评审，format 默认为 html，也支持 json |
| `exportReviewArchive(notes)` | 导出所有版本的本机评审 JSON |

导出不会提交源码、推送远端或批准版本；交接时由用户保存文件。
