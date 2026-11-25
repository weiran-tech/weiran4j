# 版本说明数据

`releases.json` 是版本说明的唯一共享来源，管理端、手机端和评审抽屉均读取它。

新建版本：`pnpm version:new -- v0.4 "订单体验优化"`。填写目标与 changes，将当前版本的状态从 draft 改为 review；确认定稿后改为 finalized，再推送相同名称的 Git tag。禁止改动已定稿版本；修订应进入下一个版本。

每条改动必填：id、type（add/modify/remove）、title、platform（manage/mobile）、page、location、before、after、rules、exceptions、acceptance。页面路径是端内可打开的真实地址；编号在同一版本唯一，工作页面链接用 /versions/<版本>/ 路径确定版本，change 参数定位改动；scope=version 看本版改动、scope=all 看完整产品。

完整产品从 page-baselines.json 的固定起始清单沿 baseline 链继承，按稳定 platform/pageId 覆盖新增与修改、排除删除；未改动页面保留，无页面改动时 changes 可为空但必须指定基线。新构建保存 product-pages.json，历史完整菜单和交互由对应不可变快照承载。

网页内的演示输入仅保存在本机。版本说明通过文件提交共享，不把 localStorage 当作团队协作数据库。`baseline` 状态仅用于引入工具前的源码基线，不表示已经归档。

全局入口例外：`/rp` 是全部版本协作首页，`/rp/help/<文章>` 是指南子页面，二者不带版本。旧版本前缀下的首页和指南会回到根路径；固定 `/releases/` 快照保持不变。原型在版本详情中按页面目录阅读；旧业务流程演示链接返回版本原型目录。
