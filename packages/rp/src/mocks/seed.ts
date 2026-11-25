import { helpEntries, helpPath } from '@/prototype/help-menu';
import type { MenuNode } from '@/types/api';
import { createBizSeed } from './seed-biz';
import { opsSeed } from './opsSeed';

export type Row = Record<string, unknown> & { id: number };
export const timestamp = '2026-11-07 09:00:00';
let menuId = 0;
function menu(title: string, path: string, component: string | null, icon = 'LayoutDashboard', children: MenuNode[] = []): MenuNode {
    const id = ++menuId;
    children.forEach((child) => { child.parentId = id; });
    return { id, parentId: 0, title, path, component, icon, type: children.length ? 'directory' : 'menu', permission: null,
        sort: id, visible: true, keepAlive: true, isExternal: false, status: 'enabled', children };
}

/** 新增原型页面时在这里登记；component 相对 src/pages，不含 .tsx。 */
export const menus = [
    menu('协作首页', '/rp', 'dashboard/DashboardPage'),
    menu('原型协作', '/rp/navigation', null, 'Layers', [
        { ...menu('交接工作台', '/rp/workflow', 'prototype/WorkflowPage', 'ClipboardList'), visible: false },
        { ...menu('版本中心', '/rp/versions', 'prototype/VersionsPage', 'GitBranch'), visible: false },
        { ...menu('版本记录', '/rp/editor', 'prototype/VersionEditorPage', 'FileText'), visible: false },
        menu('手机端预览', '/rp/mobile', 'prototype/MobilePreviewPage', 'Smartphone'),
        menu('退款交互示例', '/manage/refund-demo', 'prototype/RefundDemoPage', 'Receipt'),
        { ...menu('旧退款入口', '/manage/refund', 'prototype/LegacyRefundPage', 'Receipt'), visible: false },
    ]),
    menu('使用指南', '/help', 'help/HelpPage', 'BookOpen'),
    // 商户后台示例：用户结算已并入「用户管理」、订单管理已并入「商品与订单」，这里只剩收付与账
    menu('收付管理', '/manage/biz/pay-group', null, 'Wallet', [
        // 账户管理排最前：它是出款账户与收款渠道共同的「钱进谁、从哪个号走」的登记处 ——
        // 顺序就是使用顺序，先有账户再谈收支。
        menu('账户管理', '/manage/biz/accounts', 'biz/pay/AccountsPage', 'CreditCard'),
        menu('出款账户', '/manage/biz/payout-accounts', 'biz/pay/PayoutAccountsPage', 'Briefcase'),
        menu('收款商户', '/manage/biz/merchants', 'biz/pay/MerchantsPage', 'Building2'),
        menu('路由分流', '/manage/biz/routes', 'biz/pay/RoutesPage', 'Network'),
        // 原「收付规则」拆成两页：交易规则管成交那一刻扣多少，提现规则管用户提返利金时扣多少。
        // 挤在一页里改错一格会同时改掉两条业务线。
        menu('交易规则', '/manage/biz/trade-rules', 'biz/pay/TradeRulesPage', 'Receipt'),
        menu('提现规则', '/manage/biz/pay-rules', 'biz/pay/PayRulesPage', 'SlidersHorizontal'),
    ]),
    menu('财务管理', '/manage/biz/finance-group', null, 'ChartPie', [
        menu('支付流水', '/manage/biz/pay-flows', 'biz/finance/PayFlowsPage', 'ScrollText'),
        menu('退款管理', '/manage/biz/refunds', 'biz/finance/RefundsPage', 'History'),
        menu('提现管理', '/manage/biz/withdrawals', 'biz/finance/WithdrawalsPage', 'Package'),
        menu('未提现订单', '/manage/biz/unwithdrawn', 'biz/finance/UnwithdrawnPage', 'Timer'),
        menu('财务凭证', '/manage/biz/vouchers', 'biz/finance/VouchersPage', 'FileText'),
        menu('导出管理', '/manage/biz/exports', 'biz/finance/ExportJobsPage', 'Archive'),
    ]),
    // 运营后台示例：商品、订单与邀请返利
    menu('商品与订单', '/manage/ops-goods', null, 'ShoppingCart', [
        menu('商品管理', '/manage/ops-goods/goods', 'ops/goods/GoodsPage'),
        menu('订单管理', '/manage/ops-goods/orders', 'ops/orders/OrdersPage'),
    ]),
    menu('邀请返利', '/manage/ops-rebate', null, 'Wallet', [
        menu('邀请注册', '/manage/ops-rebate/invite', 'ops/invite/InvitePage'),
        menu('返利配置', '/manage/ops-rebate/config', 'ops/rebate-config/RebateConfigPage'),
        menu('返利明细', '/manage/ops-rebate/list', 'ops/rebates/RebatesPage'),
    ]),
    menu('用户管理', '/manage/ops-users', 'ops/users/OpsUsersPage', 'UsersRound'),
    menu('系统管理', '/manage/system', null, 'Settings', [
        // 与顶层的「用户管理」（C 端买家/卖家）区分：这里管的是后台登录账号
        menu('系统用户', '/manage/system/users', 'system/users/UsersPage', 'UsersRound'),
        menu('角色管理', '/manage/system/roles', 'system/roles/RolesPage', 'Shield'),
        menu('菜单管理', '/manage/system/menus', 'system/menus/MenusPage', 'LayoutList'),
        menu('字典管理', '/manage/system/dicts', 'system/dicts/DictsPage', 'BookOpen'),
        menu('系统配置', '/manage/system/configs', 'system/configs/ConfigsPage', 'Settings'),
        menu('短信配置', '/manage/system/sms', 'system/sms/SmsConfigsPage', 'MessageSquare'),
        menu('安全设置', '/manage/system/security', 'system/security/SecuritySettingsPage', 'Shield'),
        menu('上传设置', '/manage/system/upload-settings', 'system/upload-settings/UploadSettingsPage', 'Cloud'),
        menu('资源库', '/manage/system/media-library', 'system/media-library', 'Image'),
        menu('行政区划', '/manage/system/regions', 'system/regions/RegionsPage', 'MapPinned'),
    ]),
    menu('审计日志', '/manage/logs', null, 'ScrollText', [
        menu('登录日志', '/manage/logs/login', 'logs/LoginLogsPage'),
        menu('操作日志', '/manage/logs/operation', 'logs/OperationLogsPage'),
    ]),
    menu('IM 与客服', '/manage/im', null, 'MessageSquare', [
        menu('会话与群', '/manage/im/chats', 'im/ChatsPage', 'List'),
        menu('客服列表', '/manage/im/staff', 'im/StaffPage', 'UsersRound'),
        menu('客服分组与分流', '/manage/im/routing', 'im/RoutingPage', 'Workflow'),
        menu('客服配置', '/manage/im/config', 'im/ConfigPage', 'SlidersHorizontal'),
    ]),
    menu('Semi 组件示例', '/manage/demo', null, 'LayoutGrid', [
        menu('列表与表格', '/manage/demo/list', 'demo/DemoListPage'),
        menu('表单与组件', '/manage/demo/fields', 'demo/DemoFieldsPage'),
        menu('动态配置', '/manage/demo/config', 'demo/DemoConfigPage'),
        menu('导航与布局', '/manage/demo/navigation', 'demo/DemoNavigationPage'),
        menu('权限展示', '/manage/demo/access', 'demo/DemoAccessPage'),
        menu('批处理工作台', '/manage/demo/batch', 'demo/DemoBatchPage'),
        menu('自增序号', '/manage/demo/sequence', 'demo/DemoSequencePage'),
    ]),
    // 保留已移除流程演示菜单占用的 ID。
    ...(menuId++, []),
    menu('管理端导览', '/manage', 'prototype/ManageGuidePage', 'LayoutDashboard'),
    menu('组件示例目录', '/rp/components', 'prototype/ComponentsPage', 'LayoutGrid'),
];

// 最后分配指南子菜单 ID，既有业务菜单 ID 保持不变。
const guide = menus.find((node) => node.path === '/help')!;
guide.type = 'directory'; guide.component = null;
guide.children = helpEntries.map((entry) => ({ ...menu(entry.title, helpPath(entry.id), 'help/HelpPage', 'FileText'), parentId: guide.id }));

// 保留已移除编辑入口占用的 ID，避免既有收藏指向其他页面。
menuId++;
menus.push(menu('原型演示', '/rp/demo', 'prototype/PrototypeCatalogPage', 'LayoutGrid'));
menus.push({ ...menu('版本清单', '/versions', 'prototype/VersionListPage', 'GitBranch'), visible: false });

function flatten(nodes: MenuNode[]): Row[] {
    return nodes.flatMap(({ children, ...node }) => [{ ...node }, ...flatten(children)]);
}
function config(id: number, configKey: string, configValue: string, groupKey: string, description: string, fieldType = 'input'): Row {
    return { id, configKey, configValue, groupKey, description, fieldType, configType: fieldType === 'switch' ? 'boolean' : 'string',
        fieldOptions: null, required: false, isBuiltin: true, createdAt: timestamp, updatedAt: timestamp };
}

/* ---------- IM 与客服 ---------- */

const STAFF_ROWS = [
    { id: 1, code: 'K1001', name: '林晚', status: 'online', enabled: true, load: 8, max: 20, today: 23, firstResp: 12, score: 4.9, phone: '138****2101', joinDate: '2026-03-12', color: '#dbe6ff' },
    { id: 2, code: 'K1002', name: '周乐', status: 'online', enabled: true, load: 5, max: 15, today: 18, firstResp: 16, score: 4.8, phone: '138****2102', joinDate: '2026-04-02', color: '#e8f7ee' },
    { id: 3, code: 'K1003', name: '陈默', status: 'online', enabled: true, load: 9, max: 20, today: 31, firstResp: 9, score: 4.9, phone: '138****2103', joinDate: '2026-02-18', color: '#fdf0e6' },
    { id: 4, code: 'K1004', name: '苏晴', status: 'busy', enabled: true, load: 3, max: 20, today: 14, firstResp: 11, score: 4.9, phone: '138****2104', joinDate: '2025-12-01', color: '#f3e8ff' },
    { id: 5, code: 'K1005', name: '何川', status: 'online', enabled: true, load: 6, max: 15, today: 21, firstResp: 14, score: 4.7, phone: '138****2105', joinDate: '2026-05-09', color: '#e8f3ff' },
    { id: 6, code: 'K1006', name: '唐果', status: 'offline', enabled: true, load: 0, max: 15, today: 6, firstResp: 22, score: 4.6, phone: '138****2106', joinDate: '2026-06-21', color: '#fde8ec' },
    { id: 7, code: 'K1007', name: '郑一', status: 'online', enabled: true, load: 2, max: 10, today: 8, firstResp: 8, score: 5.0, phone: '138****2107', joinDate: '2026-01-15', color: '#fff4d6' },
    { id: 8, code: 'K1008', name: '白露', status: 'offline', enabled: true, load: 0, max: 20, today: 0, firstResp: 0, score: 0, phone: '138****2108', joinDate: '2026-10-08', color: '#e8eaee' },
    { id: 9, code: 'K1009', name: '顾言', status: 'online', enabled: true, load: 4, max: 30, today: 17, firstResp: 19, score: 4.8, phone: '138****2109', joinDate: '2025-11-20', color: '#e8f3ff' },
];

const ROUTING_RULE_ROWS = [
    { id: 1, scene: 'presale', min: 0, max: 1000, staffNames: ['林晚', '白露'], mode: 'count', count: 1, sort: 1 },
    { id: 2, scene: 'presale', min: 1000, max: 20000, staffNames: ['林晚', '周乐'], mode: 'count', count: 1, sort: 2 },
    { id: 3, scene: 'presale', min: 20000, max: null, staffNames: ['林晚', '周乐', '陈默'], mode: 'all', count: 3, sort: 3 },
    { id: 4, scene: 'trade', min: 0, max: 5000, staffNames: ['何川', '郑一'], mode: 'count', count: 1, sort: 1 },
    { id: 5, scene: 'trade', min: 5000, max: 20000, staffNames: ['陈默', '苏晴'], mode: 'count', count: 2, sort: 2 },
    { id: 6, scene: 'trade', min: 20000, max: null, staffNames: ['陈默', '苏晴', '顾言'], mode: 'all', count: 3, sort: 3 },
];

const ROUTING_FALLBACK_ROWS = [
    { id: 1, scene: 'presale', staffNames: ['顾言'], mode: 'count', count: 1 },
    { id: 2, scene: 'trade', staffNames: ['顾言', '苏晴'], mode: 'all', count: 2 },
];

const QUIET_CONFIG_ROWS = [
    { id: 1, scene: 'presale', on: true, start: '22:00', end: '09:00', timing: '用户发送后 + 进入群时', prompt: '当前非客服服务时间，请于 {结束时间} 后再试。' },
    { id: 2, scene: 'trade', on: true, start: '22:00', end: '09:00', timing: '用户发送后', prompt: '当前非客服服务时间，请于 {结束时间} 后再试。' },
];

const RECALL_CONFIG_ROWS = [
    { id: 1, allow: true, allowUser: true, windowMinutes: 2 },
];

const QUICK_REPLY_ROWS = [
    { id: 1, group: '售前', text: '您好，{商品名}目前有货，支持平台担保交易，换绑完成后再确认收货。', uses: 126 },
    { id: 2, group: '售前', text: '这个号支持小刀，最低 {价格}，含平台担保与售后保障。', uses: 88 },
    { id: 3, group: '售前', text: '您好，苹果/安卓区服均支持换绑，合同由平台提供。', uses: 64 },
    { id: 4, group: '交易', text: '您好，我是本单平台客服{客服名}，订单号 {订单号}，请卖家先发起合同。', uses: 142 },
    { id: 5, group: '交易', text: '买家已签约，请卖家在 {时间} 内完成换绑并发货。', uses: 97 },
    { id: 6, group: '交易', text: '换绑已完成，请买家登录验证后确认收货。', uses: 110 },
    { id: 7, group: '通用', text: '您好，示例商贸客服为您服务，请问有什么可以帮您？', uses: 204 },
    { id: 8, group: '通用', text: '稍等，我帮您核实一下，马上回来。', uses: 188 },
    { id: 9, group: '通用', text: '感谢您的耐心等待，祝您游戏愉快。', uses: 76 },
];

const SENSITIVE_WORD_ROWS = [
    { id: 1, word: '微信 / wx / vx', type: '防引流', level: '全局', match: '关键词 + 归一化', action: '硬拦截', hits: 38, on: true },
    { id: 2, word: 'QQ / 扣扣', type: '防引流', level: '全局', match: '关键词', action: '硬拦截', hits: 21, on: true },
    { id: 3, word: '手机号', type: '正则', level: '全局', match: '1[3-9]\\d{9}', action: '硬拦截', hits: 64, on: true },
    { id: 4, word: '外链域名', type: '正则', level: '租户', match: '非白名单域名', action: '硬拦截', hits: 12, on: true },
    { id: 5, word: '私下交易', type: '关键词', level: '业务', match: '精确 + 变体', action: '硬拦截', hits: 19, on: true },
    { id: 6, word: '加我', type: '关键词', level: '业务', match: '关键词', action: '硬拦截', hits: 26, on: true },
    { id: 7, word: '转账', type: '关键词', level: '业务', match: '关键词', action: '硬拦截', hits: 15, on: false },
];

const CHAT_CONV_ROWS = [
    {
        id: 1, groupId: 'T1G1024', title: '和平精英 · 王牌12星 满车皮', buyer: '阿泽', buyerAvatar: '泽', buyerColor: '#dbe6ff',
        type: 'presale', status: 'pending', assignee: '林晚', unread: 2, lastMessage: '这个号能小刀吗？', lastTime: '14:32',
        buyerOnline: true, level: '普通', phone: '138****6621', uid: '100238', registered: '2026-06-18', source: '商品详情页',
        orders: 3, gmv: 18600, tags: ['高意向', '价格敏感'],
        members: [{ name: '阿泽', role: '买家', online: true }, { name: '林晚', role: '客服', online: true }],
        orderId: 'SP20261021-0136', orderTitle: '和平精英 · 王牌12星 满车皮', orderPrice: 12800, orderStatus: '售前咨询', seller: '星辰游戏工作室',
    },
    {
        id: 2, groupId: 'T1G1025', title: 'AL20261021000871 · 使命召唤手游', buyer: '白桃乌龙', buyerAvatar: '桃', buyerColor: '#fde8ec',
        type: 'trade', status: 'active', assignee: '陈默', unread: 0, lastMessage: '合同我已经签好了', lastTime: '14:18',
        buyerOnline: true, level: '复购', phone: '139****8832', uid: '100234', registered: '2025-11-02', source: '交易群自动建群',
        orders: 7, gmv: 42800, tags: ['复购', '已签合同'],
        members: [{ name: '白桃乌龙', role: '买家', online: true }, { name: '陈默', role: '平台客服', online: true }, { name: '星辰游戏工作室', role: '卖家', online: true }],
        orderId: 'AL20261021000871', orderTitle: '使命召唤手游 · 神话皮肤 5 把', orderPrice: 6800, orderStatus: '已发货', seller: '星辰游戏工作室',
    },
    {
        id: 3, groupId: 'T1G1026', title: 'AL20261020000867 · 三角洲行动', buyer: '小林同学', buyerAvatar: '林', buyerColor: '#e8f7ee',
        type: 'trade', status: 'pending', assignee: '陈默', unread: 1, lastMessage: '换绑需要多久？', lastTime: '14:05',
        buyerOnline: true, level: '普通', phone: '137****2245', uid: '100241', registered: '2026-08-12', source: '交易群自动建群',
        orders: 1, gmv: 3600, tags: ['首次交易'],
        members: [{ name: '小林同学', role: '买家', online: true }, { name: '陈默', role: '平台客服', online: true }, { name: '商户客服', role: '商户客服', online: false }],
        orderId: 'AL20261020000867', orderTitle: '三角洲行动 · 满级账号', orderPrice: 3600, orderStatus: '待发货', seller: '九号工作室',
    },
    {
        id: 4, groupId: 'T1G1030', title: '王者荣耀 · 全英雄 限定皮肤齐全', buyer: '慢慢', buyerAvatar: '慢', buyerColor: '#fff4d6',
        type: 'presale', status: 'active', assignee: '林晚', unread: 0, lastMessage: '支持平台担保吗？', lastTime: '11:58',
        buyerOnline: false, level: '普通', phone: '136****7781', uid: '100219', registered: '2026-03-09', source: '商品详情页',
        orders: 0, gmv: 0, tags: ['新客'],
        members: [{ name: '慢慢', role: '买家', online: false }, { name: '林晚', role: '客服', online: true }],
        orderId: 'SP20261022-0088', orderTitle: '王者荣耀 · 全英雄 限定皮肤齐全', orderPrice: 5200, orderStatus: '售前咨询', seller: '星辰游戏工作室',
    },
    {
        id: 5, groupId: 'T1G1031', title: 'AL20261019000864 · 和平精英', buyer: '大熊', buyerAvatar: '熊', buyerColor: '#f3e8ff',
        type: 'trade', status: 'closed', assignee: '苏晴', unread: 0, lastMessage: '订单已完成，感谢您的信任', lastTime: '昨天',
        buyerOnline: false, level: '老客', phone: '135****9902', uid: '100205', registered: '2024-12-20', source: '交易群自动建群',
        orders: 12, gmv: 76000, tags: ['老客', '已成交'],
        members: [{ name: '大熊', role: '买家', online: false }, { name: '苏晴', role: '平台客服', online: false }, { name: '九号工作室', role: '卖家', online: false }],
        orderId: 'AL20261019000864', orderTitle: '和平精英 · 王牌12星', orderPrice: 9800, orderStatus: '已完成', seller: '九号工作室',
    },
    {
        id: 6, groupId: 'T1G1032', title: '和平精英 · 王牌12星 满车皮', buyer: '一只小可爱', buyerAvatar: '可', buyerColor: '#e8f3ff',
        type: 'presale', status: 'active', assignee: '林晚', unread: 0, lastMessage: '有二次实名吗？', lastTime: '14:35',
        buyerOnline: true, level: '普通', phone: '134****3312', uid: '100262', registered: '2026-10-30', source: '商品详情页',
        orders: 0, gmv: 0, tags: ['新客', '高意向'],
        members: [{ name: '一只小可爱', role: '买家', online: true }, { name: '林晚', role: '客服', online: true }],
        orderId: 'SP20261023-0042', orderTitle: '和平精英 · 王牌12星 满车皮', orderPrice: 12800, orderStatus: '售前咨询', seller: '星辰游戏工作室',
    },
];

const CHAT_MESSAGE_ROWS = [
    { id: 1, convId: 1, role: 'sys', name: '', time: '14:20', text: '平台客服 林晚 已接入会话' },
    { id: 2, convId: 1, role: 'user', name: '阿泽', time: '14:20', text: '你好，这个号还在吗？' },
    { id: 3, convId: 1, role: 'agent', name: '林晚', time: '14:21', text: '在的～和平精英安卓微信区，王牌12星，三车四枪，支持平台担保交易。' },
    { id: 4, convId: 1, role: 'user', name: '阿泽', time: '14:29', text: '这个号能小刀吗？预算一万左右' },
    { id: 5, convId: 1, role: 'agent', name: '林晚', time: '14:30', text: '我帮您申请一下，最低 ¥12,300，含平台担保和换绑服务。' },
    { id: 6, convId: 2, role: 'sys', name: '', time: '13:58', text: '订单支付成功，交易群已创建' },
    { id: 7, convId: 2, role: 'agent', name: '陈默', time: '14:00', text: '您好，我是本单平台客服陈默。请卖家先发起合同，买家确认后安排换绑。' },
    { id: 8, convId: 2, role: 'seller', name: '星辰游戏工作室', time: '14:03', text: '合同我这边已发起，买家确认下条款。' },
    { id: 9, convId: 2, role: 'user', name: '白桃乌龙', time: '14:18', text: '合同我已经签好了' },
    { id: 10, convId: 3, role: 'sys', name: '', time: '13:40', text: '交易群已创建' },
    { id: 11, convId: 3, role: 'user', name: '小林同学', time: '14:05', text: '换绑需要多久？' },
    { id: 12, convId: 3, role: 'agent', name: '陈默', time: '14:06', text: '一般 30 分钟内完成，换绑后请登录验证。' },
    { id: 13, convId: 4, role: 'sys', name: '', time: '11:40', text: '平台客服 林晚 已接入会话' },
    { id: 14, convId: 4, role: 'user', name: '慢慢', time: '11:58', text: '支持平台担保吗？' },
    { id: 15, convId: 4, role: 'agent', name: '林晚', time: '11:59', text: '支持的，所有交易都走平台担保，换绑完成后确认收货。' },
    { id: 16, convId: 5, role: 'sys', name: '', time: '昨天', text: '会话已关闭' },
    { id: 17, convId: 5, role: 'agent', name: '苏晴', time: '昨天', text: '订单已完成，感谢您的信任。' },
    { id: 18, convId: 6, role: 'sys', name: '', time: '14:30', text: '平台客服 林晚 已接入会话' },
    { id: 19, convId: 6, role: 'user', name: '一只小可爱', time: '14:35', text: '有二次实名吗？' },
    { id: 20, convId: 6, role: 'agent', name: '林晚', time: '14:36', text: '有的，支持二次实名，换绑时一起处理。' },
];
export function createSeed(): Record<string, Row[]> {
    return {
        menu: flatten(menus),
        ...opsSeed(),
        user: Array.from({ length: 28 }, (_, index) => ({ id: index + 1, username: index ? `user${index}` : 'admin',
            nickname: index ? ['林晓', '陈晨', '李明', '王悦'][index % 4] + String(index) : '原型管理员',
            phone: `138${String(index).padStart(8, '0')}`, avatar: null, gender: index % 2 ? 'female' : 'male',
            status: index === 8 ? 'disabled' : 'enabled', isBuiltin: index === 0, roleIds: [index ? 2 : 1],
            roleNames: [index ? '内容编辑' : '超级管理员'], lastLoginAt: timestamp, lastLoginIp: '127.0.0.1', createdAt: timestamp, updatedAt: timestamp })),
        role: [
            { id: 1, name: '超级管理员', code: 'super_admin', description: '原型全部操作', sort: 0, status: 'enabled', isBuiltin: true, userCount: 1, menuIds: flatten(menus).map((m) => m.id), createdAt: timestamp, updatedAt: timestamp },
            { id: 2, name: '内容编辑', code: 'editor', description: '用于演示角色维护', sort: 1, status: 'enabled', isBuiltin: false, userCount: 27, menuIds: [1], createdAt: timestamp, updatedAt: timestamp },
        ],
        dict: [
            { id: 1, name: '用户性别', code: 'sys_user_gender', status: 'enabled', isBuiltin: true, description: '用户性别选项', createdAt: timestamp, updatedAt: timestamp },
            { id: 2, name: '业务状态', code: 'business_status', status: 'enabled', isBuiltin: false, description: '原型自定义字典', createdAt: timestamp, updatedAt: timestamp },
        ],
        dictItem: [
            ...['male', 'female', 'unknown'].map((value, i) => ({ id: i + 1, dictId: 1, label: ['男', '女', '未知'][i], value, color: ['blue', 'pink', 'grey'][i], sort: i, status: 'enabled', remark: null })),
            { id: 4, dictId: 2, label: '进行中', value: 'active', color: 'green', sort: 0, status: 'enabled', remark: null },
        ],
        config: [
            config(1, 'system.general.title', 'Weiran Prototype', 'general', '原型名称'),
            config(2, 'system.general.description', '用于快速生成交互原型', 'general', '项目说明', 'textarea'),
            config(3, 'system.demo.samples', '{}', 'demo', '组件演示保存值', 'json'),
            ...['image', 'video', 'file'].flatMap((kind, i) => [
                config(10 + i * 2, `system.upload.${kind}_formats`, ['jpg,jpeg,png,webp', 'mp4,webm,mov', 'pdf,txt,zip,xlsx,docx'][i]!, 'upload', `${kind} 允许格式`),
                config(11 + i * 2, `system.upload.${kind}_max_size_mb`, '20', 'upload', `${kind} 大小上限（MB）`, 'number'),
            ]),
            config(20, 'system.sms.enabled', 'false', 'sms', '模拟短信开关', 'switch'),
        ],
        configGroup: ['general', 'upload', 'demo', 'sms'].map((key, i) => ({ id: i + 1, key, groupKey: key === 'sms' ? 'config_sms' : 'config_system',
            label: ['基础设置', '上传设置', '组件演示', '短信设置'][i], isBuiltin: i !== 2, canDelete: i === 2, createdAt: timestamp })),
        area: [
            { id: 1, code: '330000', name: '浙江省', level: 'province', parentCode: null, sort: 0, status: 'enabled', createdAt: timestamp, updatedAt: timestamp },
            { id: 2, code: '330100', name: '杭州市', level: 'city', parentCode: '330000', sort: 0, status: 'enabled', createdAt: timestamp, updatedAt: timestamp },
            { id: 3, code: '330106', name: '西湖区', level: 'county', parentCode: '330100', sort: 0, status: 'enabled', createdAt: timestamp, updatedAt: timestamp },
        ],
        loginLog: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, userId: 1, username: 'admin', ip: '127.0.0.1', browser: 'Chrome', os: 'macOS', userAgent: 'Prototype', eventType: i % 3 ? 'login' : 'logout', status: i === 5 ? 'fail' : 'success', message: '模拟访问记录', createdAt: timestamp })),
        operationLog: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, userId: 1, username: 'admin', module: 'system', description: ['新增用户', '更新配置', '分配角色'][i % 3], method: 'POST', path: '/rp/action', requestBody: '{}', responseCode: 0, success: true, errorMessage: null, durationMs: 32 + i, ip: '127.0.0.1', userAgent: 'Prototype', createdAt: timestamp })),
        mediaLibrary: [], batchJob: [], identity: [],
        // 商户后台示例：收付 / 财务 / 用户结算的业务表
        ...createBizSeed(),
        staff: STAFF_ROWS,
        routingRule: ROUTING_RULE_ROWS,
        routingFallback: ROUTING_FALLBACK_ROWS,
        quietConfig: QUIET_CONFIG_ROWS,
        recallConfig: RECALL_CONFIG_ROWS,
        quickReply: QUICK_REPLY_ROWS,
        sensitiveWord: SENSITIVE_WORD_ROWS,
        chatConv: CHAT_CONV_ROWS,
        chatMessage: CHAT_MESSAGE_ROWS,
    };
}
