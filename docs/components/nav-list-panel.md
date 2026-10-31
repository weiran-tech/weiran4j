# NavListPanel

主从页面左侧的导航列表面板。预览展示有数据、选中项和空数据形态。

<ClientOnly><ComponentGallery component="navigation" /></ClientOnly>

## 接入

```tsx
<NavListPanel title="列表" dataSource={items}
  renderItem={(item) => <NavListItem key={item.id} primary={item.name} />} />
```

父容器需设置高度或最大高度，条目区才会在面板内部滚动。条目属性详见 [NavListItem](/components/nav-list-item)。
