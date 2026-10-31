# @weiran-tech/backend-components

可供独立 React 项目复用的前端组件。提供单图与多文件上传、富文本编辑器、视频与 PDF 预览、文字头像、图标与选项选择器、文件类型图标、导航列表面板。包内不发后台请求。

GitHub Packages 安装与版本发布步骤见仓库根的 `docs/releases.md`。下游在 `backend-components-v0.3.0` 发布后用固定版本安装：`pnpm add @weiran-tech/backend-components@0.3.0`。

```tsx
import { ImageUpload } from '@weiran-tech/backend-components';
import '@weiran-tech/backend-components/style.css';

<ImageUpload
  value={imageUrl}
  onChange={setImageUrl}
  formats={['png', 'jpg', 'webp']}
  maxSizeMb={10}
  upload={async (file, onProgress) => {
    // 调用业务自己的上传接口；上传进度用 onProgress(0..100) 回报。
    return uploadImage(file, onProgress); // 返回可访问的图片 URL
  }}
  onError={(message) => showError(message)}
/>
```

`value` 为单个 URL；移除图片时回调空字符串。组件负责格式和大小校验、拖放、进度、失败重试和预览。调用方负责上传接口、权限与错误提示。`backend/src/components/SystemImageUpload.tsx` 是本仓后台的接入示例。

`FileTypeIcon` 接收 `name`（文件名或 URL）和可选 `size`；同时导出 `fileExtension`、`isImageFile`、`isVideoFile`、`isPdfFile`。`NavListPanel<T>` 接收 `dataSource` 和 `renderItem`，可选标题、搜索、加载状态和底部插槽；条目由 `NavListItem` 渲染。面板父容器需要明确高度或最大高度，条目区才能在内部滚动。

表单控件由调用方提供数据。`IconPicker` 接收 `icons`（图标名列表）及 `renderIcon(name, size)`，受控值为图标名；可直接交给 Semi `withField`。`OptionSelect` 接收 `options: { label, value, disabled? }[]`，清空时以 `undefined` 回调。后台分别通过 `components/IconPicker.tsx` 和 `components/DictSelect.tsx` 接入项目图标表、字典查询。

```tsx
import { IconPicker, OptionSelect } from '@weiran-tech/backend-components';

<IconPicker value={icon} onChange={setIcon} icons={iconNames} renderIcon={(name, size) => <MyIcon name={name} size={size} />} />
<OptionSelect value={status} onChange={setStatus} options={[{ label: '启用', value: 'enabled' }]} />
```

`FileUpload` 接收 `settings`（各类文件的格式与大小限制）和 `upload(file, onProgress)`，上传动作返回 URL 字符串或 `{ url, name? }`。单文件 `value` 是字符串，多文件传 `multiple` 后为字符串数组；`settings` 未加载时上传入口禁用。`RichTextEditor` 同样接收 `settings` 与 `upload`，图片可另外提供 `onUploadImage`。后台的同名组件负责读取系统上传配置并注入系统上传接口，业务已有调用方式保持不变。

```tsx
import { FileUpload, RichTextEditor } from '@weiran-tech/backend-components';
import '@weiran-tech/backend-components/style.css';

const settings = {
  imageFormats: ['png', 'jpg'], imageMaxSizeMb: 10,
  videoFormats: ['mp4'], videoMaxSizeMb: 100,
  fileFormats: ['pdf'], fileMaxSizeMb: 10,
};
const upload = async (file: File, onProgress: (percent: number) => void) => {
  // 调用下游上传接口并报告进度；返回可访问的 URL。
  return uploadFile(file, onProgress);
};

<FileUpload value={fileUrl} onChange={setFileUrl} settings={settings} upload={upload} />
<RichTextEditor value={html} onChange={setHtml} settings={settings} upload={upload} />
```

`VideoPreview` / `PdfPreview` 使用 `{ url, title, onClose }` 控制弹窗；PDF 地址仅允许 HTTP(S)。`TextAvatar` 使用 `{ avatar: { text, background }, fallback, size }` 渲染文字头像，不依赖用户接口。

所有组件共用 `@weiran-tech/backend-components/style.css`。消费方需要 React 19、Semi UI 2 和 lucide-react；富文本还需要 Tiptap 3，这些库均为 peer dependencies。

在仓库根运行 `pnpm --filter @weiran-tech/backend-components build` 生成 `dist`，`pnpm --filter @weiran-tech/backend-components pack:check` 检查包内容；在包目录运行 `npm pack` 生成可安装的 tarball。
