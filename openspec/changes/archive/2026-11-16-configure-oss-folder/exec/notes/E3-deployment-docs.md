# E3: 部署配置与现状说明

## 完成的 tasks.md 条目

- 6.1

## 改了什么

- application.yml 与 .env.example 新增 WEIRAN_STORAGE_ALIYUN_FOLDER，默认 media。
- 两份部署文档、后端架构契约与 sys_media 说明同步文件夹规则、历史兼容和回退限制。

## 为什么这么做

- 未配置时路径保持兼容，配置示例为 media；不把部署字段加入 HTTP DTO 或后台页面。
- Compose 已通过 env_file 透传整个服务配置，无需另加重复声明；turbo 已放行 WEIRAN_*。

## 依赖的契约

- exec/plan.md §4 的配置名称和默认值。

## 越界申报

- 无，范围与 E3 拥有文件一致。

## 埋的坑 / 遗留

- 原目录里的存量对象不搬移；文件夹切换后旧授权按原目录在其有效期内验收。

## 自测结果

- git diff --check 通过；环境变量声明与 application.yml 占位符同步。
- 全量 EnvExampleTest、docs 构建与项目门禁结果记录到 exec/evidence。
