# 新成员上手：下载与协作

> 当前版本由 AI 维护源码，网页仅记录本机评审，见[版本管理](./versions.md)。下文涉及旧 Discussion、候选、交接和批准的步骤仅作历史兼容参考，不是当前网页操作流程。
第一次使用本项目，按这条顺序操作：**获得 GitHub 访问权限 → 下载项目 → 本地启动 → 修改与提交 → PR 评审合并，发布由维护者按[部署指南](./deployment.md)完成**。

## 先确认自己需要做什么

| 使用方式 | 需要准备 | 从哪里开始 |
| --- | --- | --- |
| 只查看原型 | 团队演示站访问权限 | 直接打开演示站，不必下载代码 |
| 产品或评审参与人 | 演示站权限、GitHub 仓库访问权限 | 查看版本、操作原型、通过 Discussion 评论串记录问题与结论 |
| 修改原型的成员 | GitHub 写入权限、Git、Node.js 24、pnpm 12.15.0 | 克隆仓库，在分支上修改并提交 PR |
| 合并与部署负责人 | 仓库维护权限、部署平台或服务器权限 | 检查 PR、合并 main、发布经过验证的产物 |

项目地址：[weiran-tech/rp-example](https://github.com/weiran-tech/rp-example)。团队演示站：[rp-example.vercel.app](https://rp-example.vercel.app)。管理端使用 Semi，手机端使用 Vant；两端和使用指南属于同一个前端工程。

## 1. 加入 GitHub 协作

**新成员：**注册并登录自己的 GitHub 账号，把用户名交给项目维护者。接受邮件或 GitHub 通知中的仓库 / 组织邀请，再打开项目地址确认能够看到代码和 Discussions。

**维护者：**进入仓库 Settings 的访问管理页面，将成员加入有仓库权限的团队，或邀请为仓库协作者；根据工作分配查看、提交代码和维护权限。只需参与一个仓库的外部成员可以通过仓库协作者方式加入。操作位置及权限要求见 [GitHub 访问管理说明](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories)。

GitHub 仓库权限与演示站的 Vercel 访问权限分别管理。能打开仓库但演示站要求授权时，请维护者补充演示站权限。原型页面的 `admin` 演示账号不能代替这两项权限。

## 2. 下载项目

### 需要提交修改：使用 Git 克隆

先安装 Git、Node.js 24 和 pnpm 12.15.0。在本机终端执行：

```bash
git --version
node --version
npm install --global pnpm@12.15.0
pnpm --version

git clone https://github.com/weiran-tech/rp-example.git
cd rp-example
```

HTTPS 克隆需要使用有仓库权限的账号认证。可使用 GitHub Desktop 登录后选择 **Clone repository**；命令行按 Git 的凭据管理器完成认证。不要把访问令牌写进克隆地址、项目文件或聊天消息。

### 只想下载体验：使用 ZIP

在仓库页面选择 **Code → Download ZIP**，解压后打开项目根目录，继续执行下一节的安装和启动命令。

ZIP 不包含用于提交的 Git 历史。之后需要提交修改时，重新克隆仓库，再把本次修改的文件复制到克隆目录；不要把 ZIP 目录直接当成团队协作仓库。

### 如果要建立自己的独立项目

加入现有团队时继续使用原仓库即可。需要把这个模板用于新项目时，由新项目维护者在 GitHub 创建自己的空仓库。上传前，先在本地完成以下配置：

| 配置 | 新项目要做什么 |
| --- | --- |
| `prototype/project.mjs` | 将 `repository` 改为自己的 GitHub 仓库 |
| `prototype/discussions.json` | 清理旧示例映射，只登记新项目自己的版本 Discussion |
| `prototype/reviews.json` | 仅保留本项目仍需查阅的历史 Issue 登记 |
| `prototype/review-policy.json` | 填写新项目真实的产品和技术确认人 |
| `prototype/hosting.json` | 更换为自己的托管项目标识，不向示例站发布 |

用 `pnpm version:new -- v1.0 "团队首版原型"` 建立自己的草稿版本，再完善页面和说明。编号须唯一。完成配置和检查后提交，并上传到新仓库；以下地址须换成新仓库实际地址：

```bash
git add prototype
git commit -m "chore: 初始化团队原型项目"
git remote set-url origin https://github.com/your-team/your-prototype.git
git push -u origin main
```

进入评审前，在新仓库开启 Discussions，在 General 分类创建自己的版本 Discussion，并通过 `pnpm version:review -- v1.0 discussion:1` 登记，命令最后的 `1` 须换成实际 Discussion 编号。后续配置和功能修改都按本文的分支与 PR 流程进行。

新项目使用自己的候选、批准和发布记录；旧示例记录不代表新团队已完成评审。新仓库没有历史附件时，旧快照不可预览是正常现象。

## 3. 本地启动与体验

在包含根 `package.json` 的项目目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

| 入口 | 地址 |
| --- | --- |
| 原型协作 | http://localhost:5208/ |
| 管理端 | http://localhost:5208/manage |
| 手机端 | http://localhost:5208/mobile/ |
| 内置使用指南 | http://localhost:5208/help |

管理端演示账号为 `admin / admin123`，短信演示验证码为 `123456`。手机端不需要另外安装依赖或启动服务，文档也不需要独立启动。结束本地服务时，在启动它的终端按 `Ctrl+C`。

启动后按[产品制作与演示](./product.md)完成调整；版本范围、基线和历史页面见[版本管理与历史](./versions.md)。

## 4. 在分支上修改原型

每项工作从最新 main 创建一个分支。下面以调整退款原型为例，分支名可以换成本次任务名：

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/refund-prototype
```

如果已有未提交修改，先保存到自己的分支，再切换 main，不要用清空工作区的方式更新代码。

文件位置、菜单与 Mock 登记见[本地开发与 Mock](./development.md)。页面与本版说明同一 PR 提交，已定稿或已被承接版本保持只读，新增范围进入下一版本。

## 5. 提交代码并发起 PR

### 先检查

在项目根目录执行：

```bash
pnpm lint
pnpm test
pnpm build:site
pnpm check:site
```

页面变化还需要实际操作管理端、手机端和受影响的异常场景。单元测试通过不能代替产品确认。

### 再提交和上传分支

先查看差异。下面的 `git add` 以退款页面为例，替换成 `git status` 中本次实际修改的文件路径：

```bash
git status
git diff
git add src/pages/prototype/RefundDemoPage.tsx prototype/versions/v0.8/
git diff --cached
git commit -m "feat: 调整退款原型及验收说明"
git push -u origin feat/refund-prototype
```

源码、版本说明和必要测试可以提交；`node_modules`、`dist`、本机草稿、令牌及 `.env*.local` 不提交。上传分支只是把代码放到 GitHub，尚未合并 main，也不代表线上已更新。

### 创建 Pull Request

打开仓库 **Pull requests → New pull request**，选择 `base: main`、`compare: feat/refund-prototype`，按仓库模板填写：

- 版本 / CHG，以及关联的主评审记录、评审问题或研发任务。
- 修改前后有什么变化，受影响的管理端 / 手机端页面。
- 检查结果、截图或演示链接，以及已知限制。
- 涉及业务实现时，补充真实 PR、测试环境和业务构建。

关联需求使用 `Refs #编号`。不要用自动关闭关键词提前关闭尚未验收的产品任务。原型 PR 的代码审查、固定候选的产品批准、实际业务的产品验收是不同环节。

## 6. 评审、处理冲突并合并

**提交人：**请维护者或指定评审人检查 PR；根据意见继续在原分支修改、检查、提交并 `git push`，PR 会显示后续提交。

**合并负责人：**确认检查通过，页面、说明和评审结论一致，未解决问题已有明确去向，再合入 main。通常建议 **Squash and merge** 汇总同一任务；实际以仓库启用的合并方式为准。合并按钮和方法见 [GitHub 合并说明](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request)。

PR 提示冲突时，在自己的功能分支合入最新 main，保留双方有效内容并重新检查；不确定的业务取舍交给原作者 / 产品确认：

```bash
git fetch origin
git merge origin/main
# 处理冲突，保存文件后，用 git add 暂存已处理的文件
# 用 git status 确认是否仍需 git commit 完成合并
```

冲突处理后重新执行检查，再上传原分支。合并完成后回到本机 main：

```bash
git switch main
git pull --ff-only origin main
```

原型内容改变后，由维护者重新生成固定评审候选，并按当前候选取得产品与技术本人确认。合并 PR 不会直接把原型标为已定稿，也不会完成业务验收。

## 7. 合并后交给维护者发布

部署包下载、服务器上传、Docker、Vercel 和线上结果检查统一见[候选与部署](./deployment.md)。需要历史快照时，优先使用成功的 main 工作流生成的完整部署包。

## 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 仓库提示 404 或无法克隆 | 确认受邀账号已接受邀请且具有仓库权限 |
| 从 ZIP 下载后无法 push | 使用 Git 克隆目录提交，先保留并复制自己的修改 |
| 本机缺少历史页面 | 使用团队演示站，或下载含历史快照的 main 部署包 |
| 保存后别人看不到 | 按[共享记录与同步](./sharing.md)区分草稿、GitHub 正文和站点摘要 |
