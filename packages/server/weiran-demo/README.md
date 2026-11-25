# weiran-demo

可选的本地/测试演示模块，提供 Excel/ZIP 批处理和自增序号接口。

- 目录存在时自动加入 Gradle；`weiran-app:bootRun` 的 local profile 与集成测试自动加载。
- 使用 `developmentOnly` / `testRuntimeOnly` 依赖，普通生产 bootJar 不含本模块；自动配置也限定 local/test。
- 历史 `db/app-demo` 文件保留原文，但从本模块 jar 排除，统一由应用提供，避免同版本重复加载。
- 新增的 `db/demo-runtime` 迁移仅在 local/test 扫描，用于恢复被历史清理迁移删除的 `demo_batch_item`。
- 现有集成测试直接验证本模块，应用中的重复 Java 夹具已移除；历史 test_batch_item 迁移保留。
- 后台 pages/demo 恢复七个页面；local/test 通过追加迁移恢复组件演示菜单、权限与配置。docs/examples 继续保留独立模拟演示，历史种子不修改。

源码恢复来源：`91ea30ab36727e1cbc2acc1967719cd45bc4593f`；删除提交：`12fcda3`。

验证：JDK 21 下先运行 `./gradlew spotlessApply`，再运行 `./gradlew check --no-daemon`。
