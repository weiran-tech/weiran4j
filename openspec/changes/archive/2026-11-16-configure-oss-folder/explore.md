---
title: "OSS 文件夹配置现状调研"
status: "draft"
updated_at: "2026-11-15"
---

# Explore

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| weiran-framework | 仅确认边界 | 不修改框架契约 |
| weiran-system-infrastructure | storage/ | 对象名生成、校验及 OSS 配置 |
| weiran-app | application.yml | 部署环境变量绑定 |
| web | 通过引用索引确认 | 前端使用服务端返回的 keyPrefix，无需改页面 |

## 现有实现

以下 Java 路径均相对 `packages/server/weiran-system/weiran-system-infrastructure/src/`。

| 能力 | 位置 | 现状 |
|---|---|---|
| 配置 | main/java/com/wulicode/weiran/system/infrastructure/storage/SystemStorageProperties.java:8 | Aliyun 五项配置，无文件夹字段 |
| 对象命名 | main/java/com/wulicode/weiran/system/infrastructure/storage/MediaObjectNames.java:28 | userPrefix 写死 media/u，正则也写死 media |
| OSS 上传 | main/java/com/wulicode/weiran/system/infrastructure/storage/OssFileStorage.java:41 | 代传使用公共命名器 |
| 直传 | main/java/com/wulicode/weiran/system/infrastructure/storage/OssFileStorage.java:64 | policy、keyPrefix 和签名票据使用同一个前缀 |
| 验收 | main/java/com/wulicode/weiran/system/infrastructure/storage/OssFileStorage.java:90 | 先验证对象结构，再核对票据签名、用户、前缀与有效期 |
| 删除 | main/java/com/wulicode/weiran/system/infrastructure/storage/OssFileStorage.java:154 | 按完整 objectName 删除，校验目前只认 media |
| 本地 | main/java/com/wulicode/weiran/system/infrastructure/storage/LocalFileStorage.java:25 | 共用原命名器，需保留默认调用行为 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| MediaObjectNames | storage/ | 增加显式目录参数，保留默认 media 调用 | 是 |
| OSS policy 与票据 | OssFileStorage.authorize/inspect | 继续复用前缀和签名校验 | 只接入文件夹 |
| Spring 配置绑定 | SystemStorageProperties.Aliyun | 新字段与默认值 | 是 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| OSS 与本地共用命名器 | MediaObjectNames.java:28、LocalFileStorage.java:25 | 本地入口继续固定 media，避免连带改变 |
| 凭据参与 HMAC 签名 | OssFileStorage.java:140 | 不输出密钥，不改变签名协议 |
| 删除使用持久化对象名 | OssFileStorage.java:154 | 不按新配置替换历史根目录 |
| 前端缓存授权 | packages/manage/src/hooks/queries/system-media.ts:78 | 配置变更后旧授权到期前仍需能验收其签名票据 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| system infrastructure storage 及其测试 | 配置默认值、OSS 路径生成与校验 |
| weiran-app application.yml、.env.example | 配置占位及默认值 |
| 后端契约、部署文档及 docs/deployment.md | 记录默认值、范围及历史兼容 |
| openspec/state/bizs/sys_media.md | 同步现状 |

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 模块发现 | 未命中 |
| SL-2 | weiran-dependencies | BOM | 未命中 |
| SL-3 | weiran-app/build.gradle.kts | 装配依赖 | 未命中 |
| SL-4 | Flyway/sys_menu | 菜单与序号 | 未命中，不改菜单 |
| SL-5 | 页面与注册表 | 页面配对 | 未命中，不改页面 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 全局错误码 | 未命中 |
| SL-7 | framework 分页与响应 | API 包络 | 未命中 |

#### 序号型资源

| 资源 | 是否命中 · 预计改动 |
|---|---|
| Flyway 版本 | 未命中，无表或种子改动 |
| sys_menu ID | 未命中，无新增权限 |

#### 构建约定

| 资源 | 是否命中 · 预计改动 |
|---|---|
| build-logic | 未命中，不改质量规则 |
| 自动配置与 imports | 未命中，沿用现有 Aliyun 配置绑定 |

不会碰的目录：`packages/manage/`、`packages/semi-components/`、`weiran-framework/`、`weiran-region/`、`weiran-demo/`、所有 Flyway 迁移目录。

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 保留 media 默认值 | 命名器被本地共用 | 仅 OSS 显式传入配置，本地调用默认入口 | 已在边界声明 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 新根目录被旧正则拒绝 | 只修改生成前缀 | 同步结构校验并覆盖定制根目录回归 |
| 历史对象不可删 | 删除限定当前配置 | 保持已登记历史对象的完整名称与安全结构校验 |
| JSON policy 注入与路径穿越 | 接受任意目录文本 | 限制单级 ASCII 字母数字、连字符、下划线，拒绝斜杠等字符 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 的冲突项已回写
- [x] 可复用点已确认
