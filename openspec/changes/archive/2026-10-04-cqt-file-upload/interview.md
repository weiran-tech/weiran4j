---
title: "cqt-file-upload：前台文件上传（阿里云 OSS）"
status: "done"
updated_at: "2026-10-05"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。

- 文件上传, 赛事与报名, 后台学校审核（本 change 为其中第一项「文件上传」；三项按依赖顺序依次做）

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 文件存在哪 | 本次直接上阿里云 OSS（后端转存） | 后端接收上传、流式写入 OSS，返回 OSS 公网地址；uniapp 上传方式不变（仍调 `/api-web/local-files/upload`） |
| 2 | 单个文件大小上限 | 统一 1GB | `spring.servlet.multipart.max-file-size=1GB`；超出返回明确提示 |
| 3 | 上传要不要登录 | 必须登录 | 上传接口需前台令牌；文件按账号归目录 |
| 4 | 旧系统已上传的文件 | 本次不动，另开迁移 | 库里已有的旧地址原样返回，迁移另开 change |
| 5 | 登录后才能上传，学校注册时的营业执照 / 承诺书怎么交 | 注册时不传，登录后在「学校认证」里补 | **改 uniapp 注册页**：学校注册不再显示两个上传项，提示注册后到「我的 → 学校认证」上传；学校注册后本就是审核中（`cqt-account` FR-003），材料在认证页通过 `updateuserinfo` 补交 |
| 6 | OSS Bucket 访问权限 | 公共读 + 随机文件名 | 对象名用随机 UUID，返回固定 https 地址，库里直接存地址；不做签名 URL |

## 边界

### 要做

- `POST /api-web/local-files/upload`（multipart 字段 `file`，需登录）：校验文件非空、扩展名白名单（沿用 FastAPI：zip、xlsx、xls、pdf、doc、docx、jpg、jpeg、png、gif、mp3、mp4、mov、avi）、大小 ≤ 1GB；
  对象名 `<前缀>user_files/<账号ID>/<yyyyMM>/<UUID><扩展名>`；返回 `{url, name, path, size}`（字段同 FastAPI，uniapp 读 `data.url`）
- 文件存储端口 + 阿里云 OSS 实现（`mode=oss`，流式上传，不把整个文件读进内存）；本地目录实现（`mode=local`，仅开发 / 测试用，`/uploads/**` 提供访问）；默认 `disabled` 返回 503「文件存储未配置」
- OSS 配置走环境变量（AccessKey、Bucket、Endpoint、公网访问前缀）；`mode=oss` 缺项启动失败
- OSS SDK `com.aliyun.oss:aliyun-sdk-oss` 版本登记在 `biz-dependencies.gradle.kts`（D-013）
- uniapp `pages/login/register.vue`：学校注册隐藏营业执照、承诺书上传，加提示
- 部署文档：反向代理请求体上限 ≥ 1GB、超时；OSS Bucket 公共读

### 明确不做

- OSS 前端直传、分片 / 断点续传
- 私有 Bucket 与签名 URL
- 旧文件迁移（`admin.cqtxj.org.cn/storage/...` 等旧地址）——另开 change
- 文件删除、替换旧文件、孤儿文件清理
- 文件内容校验（病毒扫描、zip 内容检查、图片真伪）
- 上传接口限流（已改为必须登录；登录用户滥用另行处理）
- uniapp 中 Dcat 时代的旧上传入口 `upload/image`、`Upload/file`
- 修改任何上游文件

### 本次不决定(留给后续 change)

- 学校认证材料补齐的强制规则（如审核时缺材料自动驳回）——放「后台学校审核」change
- 作品文件与报名记录的关联方式——放「赛事与报名」change

## 验收标准

- [ ] AC-1 已登录用户上传白名单内的文件 → `code` 200，`data` 含 `url`（`<公网前缀>/<对象名>`）、`name`（原始文件名）、`path`（对象名）、`size`（字节数）；对象名含账号 ID 与随机 UUID
- [ ] AC-2 未登录上传 → `code` 401「请求参数缺token」
- [ ] AC-3 未带文件 → `code` 400「请选择文件」；扩展名不在白名单（如 `.exe`）→ `code` 400「不支持的文件类型」；超过 1GB → `code` 400「文件大小不能超过 1GB」；HTTP 均 200
- [ ] AC-4 存储未配置（默认）→ `code` 503「文件存储未配置」；`mode=oss` 缺 AccessKey / Bucket / Endpoint / 公网前缀任一项 → 启动失败，信息含对应环境变量名、不含 Secret
- [ ] AC-5 OSS 写入失败 → `code` 503「文件上传失败，请稍后再试」，日志记对象名与异常类名，不记凭据
- [ ] AC-6 OSS 上传为流式（以 `contentLength` 调用 `putObject(InputStream)`），不把文件整体读入内存
- [ ] AC-7 uniapp 学校注册页不再出现营业执照、承诺书上传项，并提示注册后到「学校认证」上传；个人注册不受影响
- [ ] AC-8 `./gradlew check` 全绿（含 `verifyFrameworkVersions`），`openspec check` 通过，不改上游文件
- [ ] AC-9 用真实 OSS 凭据本地上传一个文件，返回的地址可在浏览器打开（人工验证，凭据不入库）

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 存储 | OSS 后端转存 | 本地磁盘 / 前端直传 | 用户决定；前端不改上传方式 |
| 上传需登录 | 必须登录 | 公开 + 限流 | 用户决定；代价是注册页改为注册后补材料 |
| 访问权限 | 公共读 + UUID 名 | 私有 + 签名 | 用户决定；库里直接存地址，读取侧零改动 |
| 本地实现 | 保留 `mode=local` 供开发 / 测试 | 只有 OSS | 集成测试与无凭据的本地开发需要真实可写的存储 |

## 未决歧义

- 无

## 对下游的硬约束

- 接口路径、字段名沿用 FastAPI（`/api-web/local-files/upload`、`file`、返回 `url/name/path/size`），uniapp 上传工具 `util/upload.js` 不改
- OSS AccessKey 只走环境变量；Secret 不进日志与异常信息（CP-9）
- 新依赖版本只登记在 `biz-dependencies.gradle.kts`；`verifyFrameworkVersions` 不通过时先查来源，确认可接受才加白名单并写理由
- 不修改任何上游文件
