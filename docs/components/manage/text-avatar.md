# TextAvatar

文字头像，展示自定义文字和背景色、由 `fallback` 取首字的回退形态，以及小尺寸。

<ClientOnly><ComponentGallery component="avatar" /></ClientOnly>

## 接入

```tsx
<TextAvatar avatar={{ text: '微', background: '#0064FA' }} fallback="微然" size="large" />
```

组件只读取文字和背景色，不读取图片地址或用户接口。
