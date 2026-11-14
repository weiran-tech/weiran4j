# E8: 实施记录

## 完成的 tasks.md 条目

- 6.1

## 改了什么

openspec config/schema/templates

## 为什么这么做

三处注入源一起纠偏，当前 Java/MySQL/Flyway/数字0/动态菜单事实；不重写历史。

## 依赖的契约

CP/SL/WT/CC/PK/TG/DS ID 与原义保留。

## 越界申报

无越界扩大。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

各 artifact 真实 CLI 输出验证通过。 最终命令与结果见 exec/evidence 及 verify。
