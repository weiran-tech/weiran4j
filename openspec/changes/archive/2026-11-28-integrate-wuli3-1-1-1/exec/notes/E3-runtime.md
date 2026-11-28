# E3-runtime

core/MySQL starter 均 implementation，排除 mybatis-plus-jsqlparser-4.9。真实集成测试暴露 MP 默认聚合顺序导致分页 total=0，显式令 Weiran 配置先于 MP 聚合。Wuli3FoundationTest 同时装配双方配置并断言单个分页实现和有效分页链；framework 88、app 99 项测试无跳过通过。

范围遵循已批准 design；无前端业务或数据库迁移修改。L7 实际证据见 ../evidence/。
