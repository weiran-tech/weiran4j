组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:0.2.13`。

## 本版改动

- 批处理新增外部身份排队引用任务 API，调用方负责身份、引用归属及输入指纹校验；处理器必须显式授权外部身份。
- 任务创建者通过 `user_type` 与 `created_by` 共同标识，隔离外部身份与后台同号账号的查询、取消及并发限额；新增 Flyway 迁移，历史任务默认归入 `system`。
- 管理端支持在密码、短信验证码及二次验证输入框按回车提交，并统一侧栏目录与菜单项的间距。
- 同步公共前端组件包发布配置，并升级 zod 依赖。

[完整变更](https://github.com/weiran-tech/weiran4j/compare/lib-v0.2.12...lib-v0.2.13)
