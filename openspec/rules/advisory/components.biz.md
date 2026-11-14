# 下游前端公共组件

| 组件 / hook | 位置 | 用途与边界 |
|---|---|---|
| ListFeedback / ListEmptyState | `packages/manage/src/components/ListFeedback.tsx` | 两个列表复用的持久错误和成功空态；前者放表格上方保留旧数据，后者交给 Table.empty，仅成功空结果时展示；重试、清空条件由页面传入 |
| useFormCloseGuard | `packages/manage/src/hooks/useFormCloseGuard.ts` | 用户、地区新增/编辑弹窗关闭保护：比较当前值与初值，有修改时确认放弃；submit 包住校验与保存，阻止重复保存和中途关闭；保存成功沿用原 onClose；仅在内存比较，不暂存密码草稿。两个弹窗须同步使用返回的 saving 配置关闭、Esc、取消和提交按钮 |
