# @weiran-tech/prototype

从阿琅 rp 的公共实现提取的原型框架：源码版本模型与 manifest、版本概览和目录、建议人选择、多图评审、页面定位、快捷搜索、内容更新时间、HTML/JSON 导出。包不包含任何业务页面、菜单、Mock 种子、版本记录、评审数据或 GitHub Issue/Discussion 集成。

```tsx
import { createReviewStore, createReviewAuthors, RpReviewForm } from '@weiran-tech/prototype';

const reviews = createReviewStore({
  storage: localStorage,
  storageKey: 'my_project_reviews_v1',
  releases: () => releases,
  pagesForReview: release => pagesForReview(release),
  onChange: refresh,
});
const authors = createReviewAuthors(localStorage, 'my_project_authors_v1', () => reviews.readPrototype().notes);
<RpReviewForm version={release} pages={pages} actions={reviews} authorsStore={authors} />;
```

调用方维护页面数据和刷新状态；存储键必须按项目隔离。存储适配器同步完成读写，失败时应抛出错误。只允许对 `in_progress` 版本新增、编辑或删除；只读限制同样在存储边界执行。损坏数据不会被写入覆盖。支持旧单图 `image` 与多图 `images`，每条最多 6 张 PNG/JPEG/WebP，每张约 1 MB。`legacyNotes` 可映射本项目旧记录，包不读取其他项目存储。

## 入口

- 根入口：React 组件、导出与模型。
- `@weiran-tech/prototype/core`：纯模型、manifest、存储和建议人适配，不加载 React、Semi 或 CSS，可供 Node 工具使用。
- 主入口自动加载组件样式及 Semi 基础样式；`@weiran-tech/prototype/style.css` 仅保留兼容，使用方无需单独导入。样式限定在 `.prototype-scope`，使用 Semi 主题变量。

## 组件

- `RpVersionOverview`：基线、日期、本版页面数和 CHG 数；基线链接由调用方提供。
- `RpPageDirectory`：注册页面数组，支持关键词、模块过滤及完整产品/本版差异插槽；`href` 为空时显示缺失原因，包不伪造历史链接。
- `RpPageIdentity`：复制版本、端、稳定页面身份和当前路径（TELL AI）。
- `RpQuickSearch`：传入 `SearchPage[]` 和 `onNavigate`；Cmd+P 打开，方向键选择，Enter 跳转；锁屏时传 `locked`。
- `RpPageReview`：传入当前版本、页面、评审列表、存储和建议人端口；Cmd+J 打开，支持多图、编辑、删除与只读记录。
- `RpEntry`：管理端/手机端入口；可注入路由跳转，无 React Router 强依赖。
- `RpUpdatedAt`：传入源码维护的 `updatedAt`，默认 UTC+8，不能用访问时间代替。
- `exportVersion(release, pages, notes, format)`：按端→模块→页面导出 HTML 或 JSON；HTML 可打印 PDF，保留旧记录及截图。

版本和路由格式采用阿琅实现；旧项目可通过适配层转换，不覆盖既有业务或历史记录。本仓 `packages/rp/src/prototype/` 展示接入方式，交互示例在 `docs/examples/PrototypeComponentsDemo.tsx`。

## 开发和发布

在仓库根执行 `pnpm build:components`、`pnpm test:components`、`pnpm pack:components`。包版本 `0.1.0`，标签 `prototype-v0.1.0` 或 `rp-v0.1.0` 发布同一 npm 包，具体配置见 `docs/releases.md`。

`RpScopeSwitch` 复用 Alang 的胶囊标签样式，接收 `value` 与 `onChange`，管理端放置在侧栏 Logo 下方。
