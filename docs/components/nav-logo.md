# NavLogo

导航品牌入口，统一组合应用徽标与标题，复用实际后台组件。支持仅徽标、仅标题、尺寸、禁用状态和点击行为。

<ClientOnly><ComponentGallery component="nav-logo" /></ClientOnly>

```tsx
<NavLogo onClick={goHome} />
<NavLogo size={26} showTitle={false} aria-label="回到首页" onClick={goHome} />
```

默认标题为 `config.appTitle`，徽标复用 `AppLogo`。`titleClassName` 用于导航布局的标题颜色与折叠样式，其他原生按钮属性直接传递。

支持 `logoSrc` 图片、`icon` React 图标和 `textIcon`（最多两个字符）文字徽标。优先显示图片，其次图标，最后文字；图片加载失败回退图标或文字。徽标背景跟随主题色，徽标与标题均为正体。

```tsx
<NavLogo logoSrc="/logo.svg" />
<NavLogo icon={<House size={18} />} />
<NavLogo textIcon="微" title="微然管理" />
```
