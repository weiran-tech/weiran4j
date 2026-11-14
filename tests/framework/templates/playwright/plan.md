# 流程装配表

先填写前置条件、通过标准及范围，再实现步骤和 spec。

| 场景动作 | 复用或新增的步骤 | 断言/证据 |
| --- | --- | --- |
| 读取真实业务状态 | 新建 support/steps/example/replace-me.ts | observed-state |
| 清理本次创建的数据（写流程必填） | finally 中执行专用清理步骤 | cleanup-state |

写流程需声明 kind=transition：必须保存 before-state、after-state、cleanup-state；页面流程还需 before-screenshot、after-screenshot。按业务唯一键生成测试数据，记录创建 ID，避免依赖流程执行顺序。
