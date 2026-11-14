# E9: 文档、发布与全量验证

## 完成的 tasks.md 条目
- 6.1

## 改了什么
- state 中登记两张内部表，更新菜单现状，关闭 sys_menu.md#06 与 artifact.md#02/#04/#26。
- 架构文档记录一致性约束；部署说明维护窗口、旧实例写入、回退限制、local 文档开关。
- components 登记 AuthorizationFeedback；全量证据保存在 exec/evidence。

## 为什么这么做
- 只描述代码实际保证的边界；前端 30 秒约束发起，不承诺断网期间完成；数据库版本读失败不降级。
- 不用文档复制接口清单，OpenAPI 为 HTTP 事实源；不做其它资源幂等或短信/MFA 共享状态。

## 依赖的契约
- 已批准 design 和 exec/plan §4，未改变冻结契约。

## 越界申报
- 无越界扩大。README 状态索引、新组件登记、既有 fixture 与 common 的 BOM 约束属于必要连带，分别在 E1/E2/E6/E7 申报。
- React 技能检查采用单点事件清理、查询去重及状态隔离；保留项目既有 Semi UI/TanStack 选型，不迁移其它 UI 或查询库。

## 埋的坑 / 遗留
- 授权直接 SQL 写入必须同步推进 revision；旧实例不遵守新边界，须维护窗口同步切换。
- 短信/MFA 内存状态与日志搜索等原待办仍保留，不宣称已经解决；全局守卫未做大规模吞吐压测。

## 自测结果
- 按 openspec/project.json 逐条执行 build/test/lint，全部 exit 0；格式先行，JDK 21，无配置缓存或并行 clean。
- Java 322 测试，0 failures/errors/skipped；前端 55 文件/442 测试通过。
- docs 构建与真实浏览器验证通过，桌面和 390px 深色截图；0 业务请求、0 页面异常。
- openspec check --change harden-menu-and-authorization-contracts 通过；最终 verify 继续核对规格和归属。
