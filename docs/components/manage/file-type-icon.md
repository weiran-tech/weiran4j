# FileTypeIcon

根据文件名或 URL 的扩展名显示类型图标。预览展示图片、视频、PDF、Word、PPT、Excel、ZIP。

<ClientOnly><ComponentGallery component="filetype" /></ClientOnly>

## 接入

```tsx
<FileTypeIcon name="report.pdf" size={56} />
```

同一入口还导出 `fileExtension`、`isImageFile`、`isVideoFile` 和 `isPdfFile`。
