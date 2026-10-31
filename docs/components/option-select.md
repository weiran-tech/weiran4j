# OptionSelect

受控字符串下拉框。预览展示选择、清空、禁用和加载中状态。

<ClientOnly><ComponentGallery component="option" /></ClientOnly>

## 接入

```tsx
<OptionSelect value={status} onChange={setStatus}
  options={[{ label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' }]} />
```

清空时回调 `undefined`；选项数据由下游提供。
