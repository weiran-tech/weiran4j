# @weiran-tech/semi-components

可供独立 React 项目复用的前端组件。提供单图与多文件上传、支持文件上传与链接编辑的富文本编辑器、视频与 PDF 预览、文字头像、图标与选项选择器、文件类型图标、导航列表面板。包内不发后台请求。

npmjs.org 安装与版本发布步骤见仓库根的 `docs/releases.md`。下游用固定版本安装：`pnpm add @weiran-tech/semi-components@0.4.2`。

```tsx
import { ImageUpload } from '@weiran-tech/semi-components';
import '@weiran-tech/semi-components/style.css';

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

`value` 为单个 URL；移除图片时回调空字符串。组件负责格式和大小校验、拖放、进度、失败重试和预览。调用方负责上传接口、权限与错误提示。`packages/manage/src/components/SystemImageUpload.tsx` 是本仓后台的接入示例。

`FileTypeIcon` 接收 `name`（文件名或 URL）和可选 `size`；同时导出 `fileExtension`、`isImageFile`、`isVideoFile`、`isPdfFile`。`NavListPanel<T>` 接收 `dataSource` 和 `renderItem`，可选标题、搜索、加载状态和底部插槽；条目由 `NavListItem` 渲染。面板父容器需要明确高度或最大高度，条目区才能在内部滚动。

表单控件由调用方提供数据。`IconPicker` 接收 `icons`（图标名列表）及 `renderIcon(name, size)`，受控值为图标名；可直接交给 Semi `withField`。`OptionSelect` 接收 `options: { label, value, disabled? }[]`，清空时以 `undefined` 回调。后台分别通过 `components/IconPicker.tsx` 和 `components/DictSelect.tsx` 接入项目图标表、字典查询。

```tsx
import { IconPicker, OptionSelect } from '@weiran-tech/semi-components';

<IconPicker value={icon} onChange={setIcon} icons={iconNames} renderIcon={(name, size) => <MyIcon name={name} size={size} />} />
<OptionSelect value={status} onChange={setStatus} options={[{ label: '启用', value: 'enabled' }]} />
```

`FileUpload` 接收 `settings`（各类文件的格式与大小限制）和 `upload(file, onProgress)`，上传动作返回 URL 字符串或 `{ url, name? }`。单文件 `value` 是字符串，多文件传 `multiple` 后为字符串数组；`settings` 未加载时上传入口禁用。`RichTextEditor` 同样接收 `settings` 与 `upload`，图片可另外提供 `onUploadImage`。后台的同名组件负责读取系统上传配置并注入系统上传接口，业务已有调用方式保持不变。

```tsx
import { FileUpload, RichTextEditor } from '@weiran-tech/semi-components';
import '@weiran-tech/semi-components/style.css';

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

富文本中点击图片或视频后，媒体旁会弹出 Popup 布局工具：输入宽度数值，选择 `%`（1～100）或 `px`（1～2000），并选择左侧、居中或右侧。高度自动按原比例调整。宽度与位置写入 HTML 的 `data-media-width`、`data-media-align` 及内联样式，重新编辑和独立展示时都能保留；旧 HTML 的 `width` 属性也会作为像素宽度读取。

所有组件共用 `@weiran-tech/semi-components/style.css`。消费方需要 React 19、Semi UI 2 和 lucide-react；富文本还需要 Tiptap 3，这些库均为 peer dependencies。

在仓库根运行 `pnpm --filter @weiran-tech/semi-components build` 生成 `dist`，`pnpm --filter @weiran-tech/semi-components pack:check` 检查包内容；在包目录运行 `npm pack` 生成可安装的 tarball。

富文本工具栏支持上传普通文件，按 `fileFormats` 与 `fileMaxSizeMb` 校验，并以文件名链接插入正文。选中文字后使用「设置链接」新增或修改地址，「移除链接」保留文字；未选中文字时以地址作为链接文字。链接支持 HTTP(S)、邮箱、电话和站内路径，编辑中点击不跳转。上传进度与图片、视频共用上传状态，失败后可重新选择。

点击图片或视频会弹出布局工具，在同一行提供宽度输入、百分比/像素单位切换和左/中/右对齐图标，弹层沿用编辑器工具栏的边框、背景与圆角。点击外部或按 Esc 关闭；只读时不弹出工具。

选中图片后可拖动四角手柄调整大小，保持原始宽高比例；松开后保存为像素宽度，可撤销。Popup 中的位置通过左对齐、居中、右对齐图标按钮切换，当前按钮高亮。只读状态不显示缩放手柄。
