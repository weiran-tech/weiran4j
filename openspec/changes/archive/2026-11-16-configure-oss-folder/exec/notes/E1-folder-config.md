# E1: OSS 文件夹配置

## 完成的 tasks.md 条目

- 3.1

## 改了什么

- SystemStorageProperties.Aliyun 新增 folder 和 @DefaultValue("media")；规范构造器标记 @ConstructorBinding，保留原五参构造器。
- SystemStoragePropertiesTest 验证缺省与显式绑定、旧构造器、显式空值、非法字符与长度上限。

## 为什么这么做

- 让未提供新属性的下游继续使用 media，显式空字符串不回退默认值。
- 不将目录做成运行期数据库设置，避免授权缓存与全局配置并发变化。

## 依赖的契约

- exec/plan.md §4 folder 默认值及单级安全格式。

## 越界申报

- 必要连带：目录校验函数位于 E2 拥有的 MediaObjectNames.java，实际接入点在 OssFileStorage 创建客户端前；E1/E2 由同一 agent 串行完成，无并发消费者。

## 埋的坑 / 遗留

- 配置绑定成功不表示 OSS 已启用；目录校验在 OSS 实例创建前执行，本地与禁用模式不受未用 OSS 参数影响。

## 自测结果

- JDK 21，spotlessApply 后 :weiran-system-infrastructure:test 通过；包含 13 条配置测试。
- 最终全量证据以 exec/evidence 为准。
