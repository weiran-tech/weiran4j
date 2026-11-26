# FileUpload

通用文件上传。预览展示单文件、多文件、拖动或按钮排序、禁用状态；格式和大小限制由 `settings` 提供。

<ClientOnly><ComponentGallery component="file" /></ClientOnly>

## 接入

```tsx
<FileUpload value={url} onChange={setUrl} settings={settings} upload={uploadFile} />
<FileUpload multiple value={urls} onChange={setUrls} settings={settings} upload={uploadFile} />
```

单文件值为 URL 字符串，多文件值为 URL 数组。上传进度通过 `uploadFile(file, onProgress)` 报告。
