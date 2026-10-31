# ImageUpload

单图上传，支持格式和大小校验、上传进度、失败重试、移除及预览。下面展示可上传和禁用两种形态；选择图片后可查看上传后的形态。

<ClientOnly><ComponentGallery component="image" /></ClientOnly>

## 接入

```tsx
<ImageUpload value={url} onChange={setUrl} formats={['png', 'jpg']} maxSizeMb={10}
  upload={(file, onProgress) => uploadImage(file, onProgress)} />
```

`value` 是图片 URL，移除时 `onChange('')`。`upload` 返回可访问的 URL；实际文件存储由下游实现。
