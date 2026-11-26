# Issue 自动加入 WeiranProject

本仓库的 issue 在新建、重新打开或转入时，由
[`add-issues-to-project.yml`](workflows/add-issues-to-project.yml) 自动加入组织项目
[WeiranProject](https://github.com/orgs/weiran-tech/projects/2)。不筛选标签，也不自动添加 PR。

## 令牌配置

在仓库 Settings → Secrets and variables → Actions 中配置 secret `ADD_TO_PROJECT_PAT`；
也可以使用对本仓库开放的同名组织 secret。令牌持有人必须有目标项目的写入权限。

- 使用 classic PAT 时授予 `project` scope；访问私有仓库还需要相应的 `repo` scope。
- 使用 fine-grained PAT 时，资源所有者选择 `weiran-tech`，授予组织 Projects 读写权限，
  以及本仓库 Issues 读取权限；组织要求审批或 SSO 授权时，需完成相应授权。
- 默认 `GITHUB_TOKEN` 仅限仓库，不能替代访问组织项目的令牌。

参考 [GitHub 官方自动化说明](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)
与 [actions/add-to-project](https://github.com/actions/add-to-project)。不要将令牌写进源码或日志。

## 生效与排障

工作流合入默认分支后生效，不会自动回填已有 issue。已有 issue 可手动加入项目；
关闭后重新打开也会触发该工作流，但会产生 issue 状态变更。

在 Actions → Add issues to project 查看运行结果：

- `Check project token` 失败：检查 secret 是否存在及组织 secret 是否允许本仓库使用。
- 添加步骤报权限错误：检查令牌有效期、项目写权限及组织授权。
- 成功后到 WeiranProject 确认 issue 已出现；本工作流只添加条目，不修改状态、优先级等字段。
