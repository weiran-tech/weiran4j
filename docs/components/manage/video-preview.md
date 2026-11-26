# VideoPreview

视频弹窗预览。输入可访问的视频 URL 后可打开播放器；关闭弹窗时播放器卸载并停止播放。媒体地址仅接受 HTTP / HTTPS，其他协议显示无效地址提示，不创建播放器。

<ClientOnly><ComponentGallery component="video" /></ClientOnly>

## 接入

```tsx
<VideoPreview url={open ? videoUrl : null} title="视频预览" onClose={() => setOpen(false)} />
```
