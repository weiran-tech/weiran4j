# E4: 实施记录

## 完成的 tasks.md 条目

- 3.2

## 改了什么

MybatisUserRepository / MybatisRoleRepository / 对应用例

## 为什么这么做

标量 CAS 先于关系替换和吊销；角色菜单共享版本；其他原子重叠写入推进版本。

## 依赖的契约

编辑 version 与 CAS 端口。

## 越界申报

无越界扩大。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

真实 HTTP 同版并发只接受一次、关系/令牌回滚及本人交错写入通过。 最终命令与结果见 exec/evidence 及 verify。
