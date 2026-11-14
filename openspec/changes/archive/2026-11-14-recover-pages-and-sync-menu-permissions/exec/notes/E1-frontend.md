# E1: 页面恢复、窄屏查询与菜单权限同步

## 完成的 tasks.md 条目

5.1、5.2、5.3、5.4、6.1、6.2，以及验证追加的6.3。

## 改了什么

- PageErrorBoundary在页面和App根部提供持续恢复界面，不显示原始错误；路径变化只清除根故障，不通过key重挂正常外壳。
- RecoverablePage使用稳定loader的lazy缓存，主动重试重建实例；公共page-loader在失败时释放对应缓存，旧请求不能删掉新实例。App动态和固定页面均使用它。
- KeywordSearchInput复用于用户快捷、高级和docs，两个入口同一draft.keyword，原search/reset/remove/paging继续工作。
- menus成功回调并行失效资源和authKeys.me/menus；失败不失效。
- docs新增渲染/加载恢复、跨屏查询，权限同步可选择菜单来源；docs/turbo.json跟踪复用的后台源码。
- 组件登记、list-view建议与三条已解决状态同步；之前审查的artifact#23/#24保留。

## 为什么这么做

页面边界隔离错误，保留导航与其他页签；公共lazy缓存保留正常页已完成的加载，只在用户主动恢复时重建，避免假重试和正常页重开的等待回归。不选择清空所有缓存、自动无限重载或重写后端接口。

## 依赖的契约

原始loader签名不变，只导出类型供恢复包装使用；注册表归一化和旧lazy helper保持兼容。keyword继续用原参数；authKeys继续前缀匹配含会话后缀的键。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 影响 |
|---|---|---|---|
| utils/page-loader.ts | 注册表与恢复组件/doc共享正常lazy缓存和失败重建；直接从含glob注册表导入会把后台页面带入docs | 必要连带 | 既有API兼容，注册表与页签回归通过 |
| docs/turbo.json | 验证发现docs的默认缓存未包含其直接复用的后台源码，构建可能重放旧演示 | 必要连带 | 只扩充docs构建输入，dry-run确认与真实cache-miss构建通过 |

## 埋的坑 / 遗留

持久部署资源故障仍可能需要用户主动刷新，界面明确提供入口，不做自动循环。其他表单/列表保护仍是artifact#23/#24；未扩展上传原子性和地区候选树。原sys_task、部署手册及批处理迁移保留不动。

## 自测结果

- 全量50文件/379用例通过，较基线新增16用例；JDK21先spotlessApply，再完整project.json build/test/lint，全部exit0。
- 首轮全量发现3个正常页重开等待回归，已以稳定正常lazy缓存修正，原NavPreferences及路由/恢复等66个相关用例通过后，最终全量通过。
- doc最终cache-miss构建成功，docs-cache.json确认后台源码纳入缓存输入；预览重启后验证最终产物。
- Chromium验证docs三场景，无业务请求/未捕获异常/390px溢出；真实后台390px昵称keyword查询、1440px共享草稿及清空请求通过；截图人工检查正常。接口使用本地虚构响应。
- 按react-best-practices检查独立边界、稳定组件引用、并行查询失效、Suspense和可访问操作；不新增第三方依赖。
