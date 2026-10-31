# RichTextEditor

富文本编辑器，支持图片与视频上传。预览展示可编辑和只读状态，编辑后可展开查看 HTML；选中媒体后可设置宽度（百分比或像素）与水平位置。

<ClientOnly><ComponentGallery component="editor" /></ClientOnly>

## 接入

```tsx
<RichTextEditor value={html} onChange={setHtml} settings={settings} upload={uploadFile} />
```

保存值为 HTML。上传和媒体格式限制由下游提供；媒体布局同时写入数据属性和内联样式，重新打开时可恢复。
