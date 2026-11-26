# IconPicker

由调用方提供图标名称和渲染函数。预览展示选择、清空及禁用状态。

<ClientOnly><ComponentGallery component="icon" /></ClientOnly>

## 接入

```tsx
<IconPicker value={icon} onChange={setIcon} icons={iconNames}
  renderIcon={(name, size) => <MyIcon name={name} size={size} />} />
```

图标白名单由下游维护；组件包不内置项目菜单图标表。
