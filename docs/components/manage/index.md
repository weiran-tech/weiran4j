# Manage 组件

`@weiran-tech/manage` 提供后台界面组件，上传、接口调用和业务状态由调用方注入。NavLogo 属于当前后台应用的品牌组件，文档复用应用实现，不从 npm 包导出。

```tsx
import "@weiran-tech/manage/style.css";
```

| 组件 | 用途 |
| --- | --- |
| [ImageUpload](/components/manage/image-upload) | 单图上传 |
| [FileUpload](/components/manage/file-upload) | 文件上传 |
| [RichTextEditor](/components/manage/rich-text-editor) | 富文本编辑 |
| [VideoPreview](/components/manage/video-preview) | 视频预览 |
| [PdfPreview](/components/manage/pdf-preview) | PDF 预览 |
| [FileTypeIcon](/components/manage/file-type-icon) | 文件类型图标 |
| [TextAvatar](/components/manage/text-avatar) | 文字头像 |
| [IconPicker](/components/manage/icon-picker) | 图标选择 |
| [OptionSelect](/components/manage/option-select) | 选项选择 |
| [NavLogo](/components/manage/nav-logo) | 应用导航品牌 |
| [NavListPanel](/components/manage/nav-list-panel) | 导航列表 |
| [NavListItem](/components/manage/nav-list-item) | 导航条目 |

安装版本与依赖见[版本发布](/releases)。所有预览使用真实组件与本地数据；不访问生产服务。

[工具函数与类型](./utilities)汇总公开辅助 API。
