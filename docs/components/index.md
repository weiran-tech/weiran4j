# 公共组件

`@weiran-tech/backend-components` 提供可在独立 React 项目中使用的组件。每个组件有单独的预览页，展示常见形态和最小接入方式。预览只用本地状态；上传文件会生成浏览器临时 URL，不调用后台接口，刷新页面后清空。

| 组件 | 预览内容 |
| --- | --- |
| [ImageUpload](/components/image-upload) | 单图上传、预览、禁用 |
| [FileUpload](/components/file-upload) | 单文件、多文件、排序、禁用 |
| [RichTextEditor](/components/rich-text-editor) | 编辑、只读、媒体布局 |
| [VideoPreview](/components/video-preview) | 视频弹窗 |
| [PdfPreview](/components/pdf-preview) | PDF 弹窗 |
| [FileTypeIcon](/components/file-type-icon) | 常见扩展名 |
| [TextAvatar](/components/text-avatar) | 自定义、回退、小尺寸 |
| [IconPicker](/components/icon-picker) | 选择、清空、禁用 |
| [OptionSelect](/components/option-select) | 选择、禁用、加载 |
| [NavListPanel](/components/nav-list-panel) | 数据列表、空列表 |
| [NavListItem](/components/nav-list-item) | 普通与选中条目 |

使用前请先按[版本发布](/releases)配置 GitHub Packages 并安装固定版本，页面同时导入 `@weiran-tech/backend-components/style.css`。组件包不调用后台接口；实际上传由下游传入 `upload` 回调。
