# PdfPreview

PDF 弹窗预览。输入可访问的 HTTP(S) PDF URL 后可打开浏览器内置阅读器；关闭弹窗时卸载阅读器。

<ClientOnly><ComponentGallery component="pdf" /></ClientOnly>

## 接入

```tsx
<PdfPreview url={open ? pdfUrl : null} title="PDF 预览" onClose={() => setOpen(false)} />
```

仅接受 HTTP(S) 地址；无效地址会显示错误提示。
