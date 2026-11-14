---
title: "页面恢复与菜单同步验收"
status: "ready"
updated_at: "2026-11-14"
---

# Verify

# 一、集成记录(L6)

单工作区、单执行单元，无并行集成。已读取 notes/E1-frontend.md；任务全完成，原始loader签名、HTTP与权限码保持不变。

## 重复实现消除

页面和docs复用PageErrorBoundary/RecoverablePage；页面注册表与恢复组件复用page-loader正常缓存和主动重建；两处关键字与docs复用KeywordSearchInput，仍只有一份页面草稿。

## 被牺牲的方案

- 不仅清除错误边界状态，必须重建失败lazy实例以实现真实重试。
- 不每次重开都新建lazy，正常已完成加载保持缓存，避免页签等待回归。
- 不清空全部Query或全部页签，不自动无限刷新；持久资源故障由明确的主动刷新兜底。

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| utils/page-loader.ts | E1 | 必要连带 | 保留，加载缓存与恢复共用，避免docs导入glob注册表而带入全部后台页 |
| docs/turbo.json | E1 | 必要连带 | 保留，解决docs直接复用后台源码时缓存输入遗漏，任务6.3记录 |

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ✅ exit0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ✅ exit0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ✅ exit0 | `evidence/lint.log` |

最终源码修改后完整运行，JDK21，先spotlessApply；Gradle正常复用UP-TO-DATE任务。前端50个测试文件、379个用例全部通过，比基线新增16用例。无存量红灯豁免。docs另以pnpm build:docs真实cache-miss构建成功（evidence/docs.log）；既有依赖打包体积/模块指令提示不阻断构建。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 5.1 | E1 | PageErrorBoundary、RecoverablePage、page-loader、App和注册表；故障及保活测试 | ✅ |
| 5.2 | E1 | UsersPage、KeywordSearchInput及用户页回归 | ✅ |
| 5.3 | E1 | menus hooks及三类成功/失败同步测试 | ✅ |
| 5.4 | E1 | docs演示、组件清单/list-view、artifact/sys_user/sys_menu现状 | ✅ |
| 6.1 | E1 | RecoverablePage、App、UsersPage、menus-refresh四组测试；原页签回归 | ✅ |
| 6.2 | E1 | evidence/*.log、docs-browser/manage-browser.json及截图检查 | ✅ |
| 6.3 验证追加 | E1 | docs/turbo.json、docs-cache.json验证输入并真实重建 | ✅ |

未实现条目：无。

## design.md 一致性

| design章节 | 要求 | 实现 | 一致 |
|---|---|---|---|
| Architecture / 页面故障恢复 | 页面独立边界，根部兜底，真实重试，保活隔离 | 两级边界、共用正常lazy缓存、主动重建；根部resetKey不卸载正常子树 | ✅ |
| 窄屏关键字搜索 | 原keyword、同草稿、原search/reset/remove | 首部新增共享输入，查询与标签/分页逻辑沿用 | ✅ |
| 菜单权限同步 | 成功同步me/menus，失败保留快照 | menu资源与me/menus并行失效，成功/失败回归 | ✅ |
| docs | 复用实际组件、本地数据、无业务请求 | 真实恢复组件/关键字输入与Permission；缓存跟踪后台源码 | ✅ |
| API / Database | 无接口/表/迁移变化 | 后端无本次改动 | ✅ |
| Observability | 不显示原始异常/敏感信息 | 固定恢复文案，沿用Query请求提示，无新增上报服务 | ✅ |

## specs 验收标准核对

| spec / Scenario | 验证方式 | 通过 |
|---|---|---|
| admin-foundation/FR-019 页面渲染失败后恢复 | 组件与真实App故障注入，导航保留、原始错误不显示、重试有效；docs浏览器返回首页 | ✅ |
| admin-foundation/FR-019 懒加载失败后真实重试 | loader首次拒绝第二次成功、调用次数2；持续失败不自动循环，主动刷新回调；docs浏览器 | ✅ |
| admin-foundation/FR-019 页签缓存下故障隔离 | 缓存与非缓存隔离、正常页草稿、页签刷新；原NavPreferences及未登录固定页用例 | ✅ |
| admin-foundation/FR-005 菜单变更后同步当前界面权限 | 新增/编辑/删除三类成功与失败，活动身份和菜单请求次数、实际Permission与导航更新 | ✅ |
| admin-foundation/FR-005 原有角色同步及种子配对场景 | 原roles-refresh和page-registry随完整测试执行通过 | ✅ |
| user-list-search/FR-006 面板默认收起且字段齐全 | 关键字+原8个单字段，共9项标签测试，原面板收起行为保留 | ✅ |
| user-list-search/FR-006 搜索发出对应参数 | 原单字段/日期回归、keyword昵称参数及条件移除/重置回第一页 | ✅ |
| user-list-search/FR-006 窄屏共享关键字查询 | 390px真实后台高级面板查昵称，1440px共享草稿、清空后刷新请求无keyword | ✅ |
| docs现行演示要求FR-018（未修改） | 最终docs构建、三场景浏览器交互、0业务请求/0未捕获错误/0移动溢出 | ✅ |

AC-1：边界与App错误回归；AC-2：loader调用次数和持续失败；AC-3：保活/根部/固定页测试；AC-4：用户回归与真实浏览器；AC-5：三类菜单mutation回归；AC-6：docs构建与浏览器证据；AC-7：完整门禁与现状更新，均通过。

浏览器使用本地Chromium，真实后台页面接口由虚构响应模拟，不代表重新验证后端业务契约。1440px/390px截图人工检查布局正常。最终docs构建后重启预览，避免继续使用预览进程内的旧资源映射。

## 越界检查

git status包含新文件，与plan所有权及notes必要连带对比：无未申报越界。此前审查的artifact#23/#24保留；原有sys_task、部署手册和未提交批处理迁移未修改。不改其他业务页、后端、依赖锁或流水线本体。

## 不一致项归属判定

| 发现 | 判定 | 处置 |
|---|---|---|
| 正常重开每次新建lazy导致3个原页签回归失败 | 代码错 | 共用稳定正常lazy缓存；原66个相关测试通过后完整379通过 |
| docs默认构建缓存未覆盖直接引用的后台源码，可能重放旧演示 | 代码/构建输入缺漏 | 新增docs/turbo.json跟踪manage/src，dry-run确认恢复组件/page-loader列入inputs，实际cache-miss重建；追加6.3 |
| FR-006旧清单含未实现邮箱和旧请求路径，与本轮批准的“现有8单字段+共享keyword”表述不一致 | 既有规格表述需补清，设计意图未改 | delta列明关键字+当前8个条件共9项，保持原场景标题与单字段行为，采用当前user/list路径；未新增邮箱能力或修改后端 |
| 测试选择同名group/input、移除条件命中初始Query缓存 | 测试定位/缓存预期问题 | 以textbox定位；移除后显式刷新确认当前参数，不强求已缓存查询再次请求 |

## 遗留问题

- 持久模块资源故障可能需要主动整页刷新；界面已有入口，无自动循环。
- 表单关闭保护与其他列表持续错误态尚未扩展，分别已登记artifact.md#23/#24。
- 上传部分成功、地区候选树等原待办继续保留，不扩展本轮范围。
- 无新增未登记的遗留缺陷。

## 流程反馈

L4映射守卫为硬性error，验证追加6.3在映射节以说明回指verify，不虚构新的预设执行单元。CLI中的其他项目命令不适用，按本仓project.json执行。

## 结论

- [x] 集成完成，越界汇总已写
- [x] L7三项全绿
- [x] tasks全部覆盖
- [x] design/specs一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过，进入L9人类审阅diff。

## L9 审阅记录

用户于 2026-11-14 回复「归档」，批准本次最终变更归档。
