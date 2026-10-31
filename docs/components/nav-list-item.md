# NavListItem

导航面板中的条目。预览展示普通、选中及带副标题的形态，点击可切换选中项。

<ClientOnly><ComponentGallery component="nav-item" /></ClientOnly>

## 接入

```tsx
<NavListItem primary="配置项" secondary="system.config" active={selected}
  onClick={() => setSelected(true)} />
```

通常由 [NavListPanel](/components/nav-list-panel) 的 `renderItem` 渲染。传 `onClick` 时主体是可聚焦的原生按钮。
