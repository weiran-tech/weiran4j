组件包发布坐标：`com.wulicode.weiran:weiran-dependencies:0.2.16`。

## 本版改动

- 修复开发与文档工具链的传递依赖漏洞，更新锁文件；本地 `pnpm audit` 无已知漏洞。
- 将非不可变的 GitHub Actions 标签固定到提交哈希；私有会话和 API 恢复文件通过同一文件描述符校验权限并读取，拒绝符号链接。
- 移除 GitHub Pages 发布工作流和专用子路径配置，文档站继续由 Vercel 部署。
- 整理测试框架基线和业务定义文档，统一全量运行入口，并通过 Turbo 单独编排无缓存的流程单元测试。
- 移除仓内 Claude 配置与 OpenSpec skills，保留仓库规则与规格检查。

本次未修改 Java 组件的业务接口。GitHub CodeQL 当前扫描 Actions 与 JavaScript/TypeScript，Java/Kotlin 默认自动构建的目录识别问题已登记为待办；不将前端扫描结果视为后端安全扫描通过。

[完整变更](https://github.com/weiran-tech/weiran4j/compare/lib-v0.2.15...lib-v0.2.16)
