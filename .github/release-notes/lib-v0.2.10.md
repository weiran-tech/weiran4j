组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:0.2.10`。

## 本版改动

- 批处理器可设置每个数据库事务处理 1～100 项，默认保持逐项提交。
- 批次中有项写入失败时回滚整批，再逐项重试并记录各项结果；补充事务分组测试与接入说明。

[完整变更](https://github.com/weiran-tech/weiran4j/compare/lib-v0.2.9...lib-v0.2.10)
