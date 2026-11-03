组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:0.2.12`。

## 本版改动

- 将后端 Gradle 工程迁至 `packages/server/`，Java 库模块与发布坐标保持不变。
- 开发运行时让 `bootRun` 直接读取各模块编译输出，避免 DevTools 在 JAR 重写期间重启时读取到损坏的归档。
- 管理端迁至 `packages/manage/`，公共前端包更名为 `@weiran-tech/semi-components`；同步工作区、CI、Docker 与文档路径。

[完整变更](https://github.com/weiran-tech/weiran4j/compare/lib-v0.2.11...lib-v0.2.12)
