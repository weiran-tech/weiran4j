<!-- 本文件由 `node openspec/check.mjs --write-index` 生成,不要手改 —— 手改会被 `L10/spec-index` 判为过期。 -->

# 能力索引

11 个能力 / 67 条需求 —— active 7 · partial 0 · superseded 4。

状态口径见 `openspec/config.yaml` 的 `rules.specs`:
`active` 现行有效 · `partial` 主体有效但有已知缺口(缺口写在 Purpose 里) · `superseded` 已被取代,内容仅供追溯、**不再具有约束力**。

| 能力 | 需求 | 状态 | 一句话职责 |
|---|---:|---|---|
| [admin-foundation](admin-foundation/spec.md) | 12 | active | 本能力长期承担后台管理框架的底座职责：JWT 登录与令牌吊销、基于角色-菜单的权限模型（菜单驱动前端动态路由与按钮权… |
| [continuous-integration](continuous-integration/spec.md) | 2 | active | 本能力长期负责「代码合入主分支前,由机器而不是由人的自觉来跑完哪些门禁」:触发时机、必须执行的后端、前端与规格流水线… |
| [deployment](deployment/spec.md) | 3 | active | 本能力长期负责「只依赖仓库里的产物就能部署一套可用环境」:环境变量清单与应用配置保持一致,容器镜像可构建、可运行, |
| [downstream-extension](downstream-extension/spec.md) | 10 | active | 本能力长期负责「以 git fork 跟随 weiran4j 的下游项目,不修改任何上游文件即可扩展」的约定:业务模… |
| [external-identity](external-identity/spec.md) | 10 | active | 本能力长期负责「用外部身份提供方的账号登录本系统」:按配置接入 CAS 与标准 OIDC 提供方,经可校验的协议流程… |
| [observability](observability/spec.md) | 6 | active | 本能力长期负责「线上出问题时能拿到现场」:每个请求有一个可在前后端、访问日志、异常日志、异步任务之间串联的请求号 |
| [user-list-search](user-list-search/spec.md) | 7 | active | 本能力长期负责后台用户列表的检索口径:`GET /api/users` 接受哪些查询条件、每个条件如何匹配、多个条件… |
| [admin-console-shell](admin-console-shell/spec.md) | 4 | superseded → `admin-foundation` | 本能力长期承担后台管理前端的整体外壳职责：统一的侧边菜单、顶部栏、嵌套布局路由，以及基于当前登录账号权限的菜单显隐控制 |
| [rbac-account-management](rbac-account-management/spec.md) | 5 | superseded → `admin-foundation` | 本能力长期负责后台管理员对账号（`pam_account`）生命周期的管理：分页检索账号、创建新账号、编辑账号资料、… |
| [rbac-ban-management](rbac-ban-management/spec.md) | 3 | superseded → `admin-foundation` | 本能力长期负责基于 IP 与设备标识维度的访问封禁名单管理 |
| [rbac-role-management](rbac-role-management/spec.md) | 5 | superseded → `admin-foundation` | 角色是账号与权限之间的中间层：一个角色绑定一组权限点，账号通过持有角色获得这些权限 |

> 新建能力归档后,跑 `node openspec/check.mjs --write-index` 重新生成本文件。
