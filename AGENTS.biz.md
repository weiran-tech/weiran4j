# 下游扩展：行政区划

本仓库以 git fork 跟随 weiran4j。先读 `AGENTS.md`；本文件只记录下游保留的行政区划扩展。

## 模块与边界

- `packages/server/weiran-region/` 是独立的五层业务模块，不依赖其他业务模块。模块由 `settings.gradle.kts` 自动发现，并由 `weiran-app` 装配。
- `packages/server/weiran-region/build.gradle.kts` 是给外部 Gradle 应用的入口包：编译时只暴露 `weiran-region-api`，运行时装配 adapter 与 infrastructure。外部使用时引入同版本 BOM 和 `com.wulicode.weiran:weiran-region`；本仓源码应用仍按五层项目依赖装配。AI 不应要求外部应用逐层选择 region 依赖。
- 后台页面位于 `packages/manage/src/pages/system/regions/`，地区级联组件位于 `packages/manage/src/components/RegionSelect.tsx`，图标登记于 `packages/manage/src/biz/icons-region.ts`。
- 错误码服务号 `12`、资源号 `01`；权限前缀 `region:`；菜单 ID `2000`–`2099`；表名 `region`，迁移位于 `db/migration/region/`。号段登记见 `packages/server/docs/business-modules.md`。
- 后台接口由 `/api-backend/region/area` 提供；公开启用地区树由 `/api-backend/n/region/area/getEnabledTree` 提供。接口契约以 Springdoc OpenAPI 和 `openspec/specs/administrative-regions/spec.md` 为准。
- 地区状态文档为 `openspec/state/bizs/region.md`，下游索引为 `openspec/state/bizs/README.biz.md`。

## 下游前端规则索引

- 写下游前端页面或组件前，读取 [`components.biz.md`](openspec/rules/advisory/components.biz.md)，与上游组件清单一起查找可复用能力。

## 上游同步

框架和基座改动优先回上游处理；下游扩展入口见 `packages/server/docs/01-架构与接口契约.md` §2.2。同步上游使用 `git fetch upstream` 和 `git merge upstream/main`。

启用下游提交钩子可执行 `git config core.hooksPath .githooks-biz`。该钩子先运行上游 OpenSpec 检查，再执行 `scripts/biz/upstream-boundary.sh`。其余构建和格式规则沿用 `AGENTS.md`。
