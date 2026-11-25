import type { Row } from './seed';

/** 示例商贸运营后台演示数据：商品 / 订单 / 用户 / 返利 / 返利配置。 */

export interface OpsInvitee {
    uid: string;
    nickname: string;
    reg: string;
    gmv: number;
}

export interface OpsLogRow {
    time: string;
    action: string;
    operator: string;
    remark: string;
}

/** 结算信息：从「用户结算信息」页迁过来，挂在用户行上 —— 一个用户只有一份收款去向 */
export interface OpsSettlement {
    /** 实名状态：none 未实名 / reviewing 审核中 / ok 已实名 / failed 实名失败 */
    verify: 'none' | 'reviewing' | 'ok' | 'failed';
    verifyAt: string;
    bank: {
        name: string;
        no: string;
        provider: string;
        uid3: string;
        joined: boolean;
        boundAt: string;
        state: 'active' | 'rejected';
        sync?: 'pending';
    } | null;
    alipay: { name: string; account: string; filledAt: string } | null;
}

/** 已实名用户的默认结算信息：卡与支付宝都填好、三方已开户 */
function settleOK(realName: string, bankNo: string, provider: string, uid3: string, boundAt: string,
    aliAccount: string): OpsSettlement {
    return {
        verify: 'ok',
        verifyAt: `${boundAt} 10:20`,
        bank: { name: realName, no: bankNo, provider, uid3, joined: true, boundAt, state: 'active' },
        alipay: { name: realName, account: aliAccount, filledAt: boundAt },
    };
}

function goods(id: number, code: string, unionId: string, title: string, userId: string, game: string, channel: string,
    region: string, server: string, account: string, status: string, source: string, price: number,
    createdAt: string, onAt: string, offAt = '', deletedAt = '', soldAt = '', buyerUid = ''): Row {
    return { id, code, unionId, title, userId, game, channel, region, server, account, status, source, price,
        createdAt, onAt, offAt, deletedAt, soldAt, buyerUid, logs: [] as OpsLogRow[] };
}

function order(id: number, code: string, goodsCode: string, buyerUid: string, sellerUid: string, game: string, channel: string,
    region: string, server: string, account: string, title: string, price: number, status: string,
    paidAt: string, doneAt = '', canceledAt = '', afterSaleAt = '',
    orderType: '渠道单' | '线下单' = '渠道单',
    offlinePay: { state: 'todo' | 'done'; at: string; no: string; by: string; proof: string } | null = null,
    category = '账号', profit = Math.round(price * 0.25)): Row {
    return { id, code, goodsCode, buyerUid, sellerUid, game, channel, region, server, account, title, price, status,
        paidAt, doneAt, canceledAt, afterSaleAt, orderType, offlinePay, category, profit, logs: [] as OpsLogRow[] };
}

function appUser(id: number, uid: string, displayId: string, nickname: string, phone: string, realName: string,
    idcard: string, role: string, level: string, orders: number, status: string, reg: string, real: string,
    inviteCode: string, invitedBy: string, inviteUsers: OpsInvitee[] = [], settlement: OpsSettlement | null = null): Row {
    return { id, uid, displayId, nickname, phone, realName, idcard, role, level, orders, status, reg, real, inviteCode,
        invitedBy, inviteUsers, settlement, logs: [] as OpsLogRow[] };
}

function invitee(uid: string, nickname: string, reg: string, gmv: number): OpsInvitee {
    return { uid, nickname, reg, gmv };
}

export function opsSeed(): Record<string, Row[]> {
    const seed: Record<string, Row[]> = {
        opsGoods: [
            goods(1, 'SP20261021-0137', 'KJLM0137', '穿越火线 · 后台自营 英雄级齐全', '', '穿越火线', '安卓', '微信区', '全区服', 'wx_cf_bg07****', '已上架', '后台', 3200, '2026-10-21 10:20', '2026-10-21 10:22'),
            goods(2, 'SP20261021-0136', 'KJLM0136', '和平精英 · 王牌12星 满车皮', '100238', '和平精英', '安卓', '微信区', '微信212区', 'wx_hp8891****', '已上架', '用户', 12800, '2026-10-21 09:12', '2026-10-21 09:40'),
            goods(3, 'SP20261021-0135', 'KJLM0135', '王者荣耀 · 全英雄 限定皮肤齐全', '100237', '王者荣耀', '苹果', 'QQ区', 'QQ88区', 'qq_wz5510****', '已上架', '用户', 9600, '2026-10-21 08:47', '2026-10-21 09:05'),
            goods(4, 'SP20261020-0134', 'KJLM0134', '和平精英 · 战神号 三车四枪', '100236', '和平精英', '安卓', 'QQ区', 'QQ36区', 'qq_hp2201****', '已上架', '用户', 5400, '2026-10-20 21:30', '2026-10-20 21:52'),
            goods(5, 'SP20261020-0133', 'KJLM0133', '穿越火线 · 英雄级全齐', '100231', '穿越火线', '安卓', '微信区', '微信51区', 'wx_cf7734****', '已上架', '用户', 2100, '2026-10-20 19:02', '2026-10-20 19:20'),
            goods(6, 'SP20261020-0132', 'KJLM0132', '使命召唤手游 · 神话皮肤 5 把', '100228', '使命召唤手游', '苹果', '微信区', '微信19区', 'wx_cod9082****', '已售出', '用户', 6800, '2026-10-20 15:41', '2026-10-20 16:02', '', '', '2026-10-21 09:40'),
            goods(7, 'SP20261020-0131', 'KJLM0131', '英雄联盟手游 · 宗师号 皮肤齐全', '100227', '英雄联盟手游', '苹果', 'QQ区', 'QQ12区', 'qq_lol3312****', '已下架', '用户', 3300, '2026-10-20 11:18', '2026-10-20 11:40', '2026-10-21 08:30'),
            goods(8, 'SP20261019-0130', 'KJLM0130', '和平精英 · 低价走量 单车主号', '100235', '和平精英', '安卓', '微信区', '微信7区', 'wx_hp5521****', '已下架', '用户', 1280, '2026-10-19 22:05', '2026-10-19 22:30', '2026-10-20 09:15'),
            goods(9, 'SP20261019-0129', 'KJLM0129', '三角洲行动 · 军械库满配', '100227', '三角洲行动', '安卓', 'QQ区', '全区服', 'qq_df6621****', '已上架', '用户', 2450, '2026-10-19 17:26', '2026-10-19 17:50'),
            goods(10, 'SP20261019-0128', 'KJLM0128', '王者荣耀 · 微信区大号 荣耀典藏 5 款', '100238', '王者荣耀', '苹果', '微信区', '微信203区', 'wx_wz8890****', '已售出', '用户', 8800, '2026-10-19 10:03', '2026-10-19 10:26', '', '', '2026-10-21 08:15'),
            goods(11, 'SP20261018-0127', 'KJLM0127', '和平精英 · 九车皮 顶级配置', '100237', '和平精英', '苹果', '微信区', '微信315区', 'wx_hp1122****', '已上架', '用户', 18600, '2026-10-18 20:44', '2026-10-18 21:05'),
            goods(12, 'SP20261018-0126', 'KJLM0126', '穿越火线 · 性价比号 18 英雄级', '', '穿越火线', '安卓', 'QQ区', 'QQ61区', 'qq_cfax21****', '已删除', '后台', 960, '2026-10-18 14:20', '2026-10-18 14:35', '2026-10-19 09:10', '2026-10-19 09:12'),
            goods(13, 'SP20261018-0125', 'KJLM0125', '使命召唤手游 · 双神话 满级', '100228', '使命召唤手游', '安卓', '微信区', '微信33区', 'wx_cod4471****', '已上架', '用户', 3900, '2026-10-18 09:58', '2026-10-18 10:20'),
            goods(14, 'SP20261017-0124', 'KJLM0124', '和平精英 · 战神低段 便宜出', '100235', '和平精英', '苹果', 'QQ区', 'QQ77区', 'qq_hp9930****', '已售出', '用户', 2260, '2026-10-17 21:12', '2026-10-17 21:35', '', '', '2026-10-20 22:31'),
            goods(15, 'SP20261017-0123', 'KJLM0123', '英雄联盟手游 · 大师小号', '100227', '英雄联盟手游', '安卓', 'QQ区', 'QQ25区', 'qq_lol7712****', '已下架', '用户', 1580, '2026-10-17 11:35', '2026-10-17 11:58', '2026-10-18 16:40'),
            // 与上面两条线下单配套的商品（线下单也要有来源商品，详情抽屉才查得到）
            goods(16, 'SP20261022-0137', 'KJLM0137', '原神 · 满命雷电将军 全五星', '100238', '原神', '安卓', '官服', '官服1区', 'ys_raiden****', '已售出', '用户', 4500, '2026-10-22 09:15', '2026-10-22 09:40', '', '', '2026-10-22 14:20', '100233'),
            goods(17, 'SP20261022-0138', 'KJLM0138', '永劫无间 · 双红皮 飞刀满级', '100236', '永劫无间', '苹果', '官服', '官服2区', 'naraka99****', '已售出', '用户', 3200, '2026-10-22 10:02', '2026-10-22 10:18', '', '', '2026-10-22 15:40', '100232'),
        ],
        opsOrder: [
            // 两条线下单放在最前（时间最新），演示「登记打款」的两种待办状态：
            // 17 号已填流水号但缺到账凭证 = 待上传打款信息；18 号什么都没填 = 待登记打款
            order(17, 'AL20261022000873', 'SP20261022-0137', '100233', '100238', '原神', '安卓', '官服', '官服1区', 'ys_raiden****', '原神 · 满命雷电将军 全五星', 4500, '已收货', '2026-10-22 14:20', '', '', '', '线下单', { state: 'todo', at: '2026-10-22 16:30', no: 'CMB202610221630114', by: '运营-小陈', proof: '' }),
            order(18, 'AL20261022000874', 'SP20261022-0138', '100232', '100236', '永劫无间', '苹果', '官服', '官服2区', 'naraka99****', '永劫无间 · 双红皮 飞刀满级', 3200, '已收货', '2026-10-22 15:40', '', '', '', '线下单', { state: 'todo', at: '', no: '', by: '', proof: '' }),
            order(1, 'AL20261021000871', 'SP20261020-0132', '100234', '100228', '使命召唤手游', '苹果', '微信区', '微信19区', 'wx_cod9082****', '使命召唤手游 · 神话皮肤 5 把', 6800, '已发货', '2026-10-21 09:40'),
            order(2, 'AL20261021000870', 'SP20261019-0128', '100233', '100238', '王者荣耀', '苹果', '微信区', '微信203区', 'wx_wz8890****', '王者荣耀 · 微信区大号 荣耀典藏 5 款', 8800, '已完成', '2026-10-21 08:15', '2026-10-21 10:02'),
            order(3, 'AL20261020000869', 'SP20261017-0124', '100230', '100235', '和平精英', '苹果', 'QQ区', 'QQ77区', 'qq_hp9930****', '和平精英 · 战神低段 便宜出', 2260, '已收货', '2026-10-20 22:31', '', '', '', '线下单', { state: 'todo', at: '', no: '', by: '', proof: '' }),
            order(4, 'AL20261020000868', 'SP20261021-0136', '100232', '100238', '和平精英', '安卓', '微信区', '微信212区', 'wx_hp8891****', '和平精英 · 王牌12星 满车皮', 12800, '待支付', ''),
            order(5, 'AL20261020000867', 'SP20261019-0129', '100234', '100227', '三角洲行动', '安卓', 'QQ区', '全区服', 'qq_df6621****', '三角洲行动 · 军械库满配', 2450, '已收货', '2026-10-20 16:55'),
            order(6, 'AL20261020000866', 'SP20261020-0133', '100233', '100231', '穿越火线', '安卓', '微信区', '微信51区', 'wx_cf7734****', '穿越火线 · 英雄级全齐', 2100, '已完成', '2026-10-20 14:09', '2026-10-20 15:30'),
            order(7, 'AL20261020000865', 'SP20261018-0125', '100232', '100228', '使命召唤手游', '安卓', '微信区', '微信33区', 'wx_cod4471****', '使命召唤手游 · 双神话 满级', 3900, '已退款', '2026-10-20 10:44', '', '', '2026-10-20 21:30'),
            order(8, 'AL20261019000864', 'SP20261018-0127', '100234', '100237', '和平精英', '苹果', '微信区', '微信315区', 'wx_hp1122****', '和平精英 · 九车皮 顶级配置', 18600, '已完成', '2026-10-19 21:18', '2026-10-20 11:05'),
            order(9, 'AL20261019000863', 'SP20261017-0123', '100233', '100227', '英雄联盟手游', '安卓', 'QQ区', 'QQ25区', 'qq_lol7712****', '英雄联盟手游 · 大师小号', 1580, '已取消', '2026-10-19 15:38', '', '2026-10-19 16:20'),
            order(10, 'AL20261019000862', 'SP20261020-0131', '100230', '100227', '英雄联盟手游', '苹果', 'QQ区', 'QQ12区', 'qq_lol3312****', '英雄联盟手游 · 宗师号 皮肤齐全', 3300, '已退款', '2026-10-19 09:22', '', '', '2026-10-19 20:40'),
            order(11, 'AL20261018000861', 'SP20261018-0126', '100234', '', '穿越火线', '安卓', 'QQ区', 'QQ61区', 'qq_cfax21****', '穿越火线 · 性价比号 18 英雄级', 960, '已收货', '2026-10-18 19:47', '', '', '', '线下单', { state: 'todo', at: '', no: '', by: '', proof: '' }),
            order(12, 'AL20261018000860', 'SP20261021-0135', '100233', '100237', '王者荣耀', '苹果', 'QQ区', 'QQ88区', 'qq_wz5510****', '王者荣耀 · 全英雄 限定皮肤齐全', 9600, '已支付', '2026-10-18 13:11'),
            order(13, 'AL20261018000859', 'SP20261020-0134', '100232', '100236', '和平精英', '安卓', 'QQ区', 'QQ36区', 'qq_hp2201****', '和平精英 · 战神号 三车四枪', 5400, '已完成', '2026-10-18 09:05', '2026-10-19 10:30', '', '', '线下单', { state: 'done', at: '2026-10-19 10:30', no: 'CMB202610191030221', by: '运营-财务', proof: '打款凭证-AL20261018000859.jpg' }),
            order(14, 'AL20261017000858', 'SP20261019-0130', '100230', '100235', '和平精英', '安卓', '微信区', '微信7区', 'wx_hp5521****', '和平精英 · 低价走量 单车主号', 1280, '已退款', '2026-10-17 20:29', '', '', '2026-10-18 09:50'),
            order(15, 'AL20261017000857', 'SP20261021-0136', '100234', '100238', '和平精英', '安卓', '微信区', '微信212区', 'wx_hp8891****', '和平精英 · 王牌12星 满车皮', 12800, '已完成', '2026-10-17 12:40', '2026-10-17 18:02'),
            order(16, 'AL20261017000856', 'SP20261020-0132', '100233', '100228', '使命召唤手游', '苹果', '微信区', '微信19区', 'wx_cod9082****', '使命召唤手游 · 神话皮肤 5 把', 6800, '已关闭', '', '', '2026-10-17 12:00'),
        ],
        opsUser: [
            appUser(1, '100238', 'U100238', '星辰游戏工作室', '138****6621', '陈志远', '3501**********2314', '商家', 'B', 412, '正常', '2025-03-12', '已实名', 'AL7K2M9X', '', [
                invitee('100234', '阿泽', '2026-01-08', 1280), invitee('100230', '慢慢', '2026-04-15', 640), invitee('100231', '拾光账号', '2025-09-30', 0),
            ], settleOK('陈志远', '6225 **** **** 2314', '汇付天下', 'HFU20250312000412', '2025-03-12', 'chen***@163.com')),
            appUser(2, '100237', 'U100237', '老兵账号铺', '139****3344', '王志强', '1101**********7788', '商家', 'A', 286, '正常', '2025-05-20', '已实名', 'AL5T8Q3W', '', [
                invitee('100233', '白桃乌龙', '2026-02-19', 3460), invitee('100232', '老陈', '2026-03-27', 820), invitee('100236', '极速换绑工作室', '2025-08-02', 0),
            ], settleOK('王志强', '6228 **** **** 7788', '汇付天下', 'HFU20250520000833', '2025-05-20', 'wang***@qq.com')),
            appUser(3, '100236', 'U100236', '极速换绑工作室', '137****8890', '李海涛', '4401**********0918', '商家', 'B', 174, '正常', '2025-08-02', '已实名', 'AL9C4H6Y', '100237', [
                invitee('100228', '九号工作室', '2025-06-18', 5120), invitee('100227', '青柠账号', '2025-12-01', 2050),
            ], settleOK('李海涛', '6217 **** **** 0918', '易宝支付', 'YBU20250802001176', '2025-08-02', 'li***@139.com')),
            // 只绑了银行卡、还没填支付宝：演示「支付宝未填写」这一支
            appUser(4, '100235', 'U100235', '风语工作室', '138****2093', '张伟', '3201**********4455', '商家', 'C', 63, '冻结', '2025-11-14', '已实名', 'AL3P7N1R', '', [], {
                verify: 'ok', verifyAt: '2025-11-14 09:36',
                bank: { name: '张伟', no: '6222 **** **** 4455', provider: '汇付天下', uid3: 'HFU20251114000265',
                    joined: true, boundAt: '2025-11-14', state: 'active' },
                alipay: null,
            }),
            appUser(5, '100234', 'U100234', '阿泽', '139****7712', '刘泽宇', '3301**********1122', '买家', 'E', 31, '正常', '2026-01-08', '已实名', 'AL2D6V8B', '100238', [],
                settleOK('刘泽宇', '6225 **** **** 1122', '汇付天下', 'HFU20260108000504', '2026-01-08', 'liu***@qq.com')),
            appUser(6, '100233', 'U100233', '白桃乌龙', '135****1122', '陈雅琪', '3502**********3344', '买家', 'D', 18, '正常', '2026-02-19', '已实名', 'AL8W3F5K', '100237', [
                invitee('100229', '小林同学', '2026-05-06', 0),
            ], settleOK('陈雅琪', '6217 **** **** 3344', '易宝支付', 'YBU20260219000931', '2026-02-19', 'chen***@139.com')),
            appUser(7, '100232', 'U100232', '老陈', '136****4455', '陈建国', '5101**********6677', '买家', 'E', 9, '正常', '2026-03-27', '已实名', 'AL4J9S2C', '100237', [],
                settleOK('陈建国', '6222 **** **** 6677', '汇付天下', 'HFU20260327000618', '2026-03-27', 'chenjg***@163.com')),
            appUser(8, '100231', 'U100231', '拾光账号', '137****6677', '赵鹏', '4201**********9900', '商家', 'D', 98, '正常', '2025-09-30', '已实名', 'AL6B1Y7Z', '100238', [],
                settleOK('赵鹏', '6228 **** **** 9900', '汇付天下', 'HFU20250930000742', '2025-09-30', 'zhao***@qq.com')),
            appUser(9, '100230', 'U100230', '慢慢', '138****9900', '周漫', '4401**********2233', '买家', 'E', 12, '正常', '2026-04-15', '已实名', 'AL1M5K9D', '100238', [],
                settleOK('周漫', '6225 **** **** 2233', '汇付天下', 'HFU20260415000287', '2026-04-15', 'zhou***@163.com')),
            // 未实名：没有结算信息可看，结算信息按钮不出现
            appUser(10, '100229', 'U100229', '小林同学', '139****2233', '—', '—', '买家', '', 5, '封禁', '2026-05-06', '未实名', 'AL7R3Q2T', '100233', [], {
                verify: 'none', verifyAt: '', bank: null, alipay: null,
            }),
            appUser(11, '100228', 'U100228', '九号工作室', '137****7734', '孙浩', '6101**********7734', '商家', 'C', 203, '正常', '2025-06-18', '已实名', 'AL9F4W6H', '100236', [],
                settleOK('孙浩', '6217 **** **** 7734', '易宝支付', 'YBU20250618001455', '2025-06-18', 'sun***@139.com')),
            appUser(12, '100227', 'U100227', '青柠账号', '137****4455', '吴倩', '3401**********4455', '商家', 'D', 71, '正常', '2025-12-01', '已实名', 'AL3N8S5L', '100236', [],
                settleOK('吴倩', '6222 **** **** 4455', '汇付天下', 'HFU20251201000820', '2025-12-01', 'wu***@163.com')),
        ],
        opsRebate: [
            { id: 1, code: 'RB20261021-0081', orderCode: 'AL20261021000870', buyerUid: '100233', inviterUid: '100237', price: 8800, category: '账号', level: 'A', origin: '专属', mode: 'rate', rate: 8, amount: 704, profit: 2200, status: '待审核', relation: '下单改填', codeAt: '2026-10-21 09:58', createdAt: '2026-10-21 10:02', paidAt: '', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 2, code: 'RB20261021-0080', orderCode: 'AL20261020000869', buyerUid: '100230', inviterUid: '100238', price: 2260, category: '账号', level: 'B', origin: '等级', mode: 'rate', rate: 5, amount: 113, profit: 400, status: '已返利', relation: '注册绑定', codeAt: '', createdAt: '2026-10-21 09:12', paidAt: '2026-10-21 11:05', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 3, code: 'RB20261020-0079', orderCode: 'AL20261020000866', buyerUid: '100233', inviterUid: '100237', price: 2100, category: '账号', level: 'A', origin: '专属', mode: 'rate', rate: 8, amount: 168, profit: 620, status: '待审核', relation: '注册绑定', codeAt: '', createdAt: '2026-10-20 15:30', paidAt: '', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 4, code: 'RB20261020-0078', orderCode: 'AL20261019000864', buyerUid: '100234', inviterUid: '100238', price: 18600, category: '账号', level: 'B', origin: '等级', mode: 'rate', rate: 5, amount: 930, profit: 3200, status: '已返利', relation: '注册绑定', codeAt: '', createdAt: '2026-10-20 11:05', paidAt: '2026-10-20 14:22', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 5, code: 'RB20261020-0077', orderCode: 'AL20261020000867', buyerUid: '100234', inviterUid: '100236', price: 2450, category: '账号', level: 'B', origin: '专属', mode: 'rate', rate: 6, amount: 147, profit: 380, status: '待审核', relation: '下单改填', codeAt: '2026-10-20 16:48', createdAt: '2026-10-20 16:55', paidAt: '', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 6, code: 'RB20261019-0076', orderCode: 'AL20261018000861', buyerUid: '100234', inviterUid: '100238', price: 960, category: '账号', level: 'B', origin: '等级', mode: 'rate', rate: 5, amount: 48, profit: 120, status: '已返利', relation: '注册绑定', codeAt: '', createdAt: '2026-10-19 09:15', paidAt: '2026-10-19 10:40', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 7, code: 'RB20261018-0075', orderCode: 'AL20261018000859', buyerUid: '100232', inviterUid: '100237', price: 5400, category: '账号', level: 'A', origin: '专属', mode: 'rate', rate: 8, amount: 432, profit: 900, status: '已返利', relation: '注册绑定', codeAt: '', createdAt: '2026-10-18 14:20', paidAt: '2026-10-18 16:08', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 8, code: 'RB20261017-0074', orderCode: 'AL20261017000857', buyerUid: '100234', inviterUid: '100238', price: 12800, category: '账号', level: 'B', origin: '等级', mode: 'rate', rate: 5, amount: 640, profit: 2600, status: '已返利', relation: '注册绑定', codeAt: '', createdAt: '2026-10-17 18:02', paidAt: '2026-10-17 20:30', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 9, code: 'RB20261018-0073', orderCode: 'AL20261018000859', buyerUid: '100232', inviterUid: '100236', price: 5400, category: '道具', level: 'B', origin: '等级', mode: 'fixed', rate: 0, amount: 6, profit: 900, status: '已返利', relation: '注册绑定', codeAt: '', createdAt: '2026-10-18 14:20', paidAt: '2026-10-18 16:10', supplementName: '', internalRemark: '', logs: [] as OpsLogRow[] },
            { id: 10, code: 'RB20261020-0072', orderCode: 'AL20261019000864', buyerUid: '100234', inviterUid: '100231', price: 18600, category: '账号', level: 'D', origin: '手动', mode: 'fixed', rate: 0, amount: 88.88, profit: 3200, status: '待审核', relation: '客服补录', codeAt: '', createdAt: '2026-10-20 11:20', paidAt: '', supplementName: '', internalRemark: '买家忘记填推荐码，客服核实后补录', logs: [] as OpsLogRow[] },
            { id: 11, code: 'RB20261020-0071', orderCode: 'AL20261019000864', buyerUid: '100234', inviterUid: '100238', price: 18600, category: '账号', level: 'B', origin: '补发', mode: 'fixed', rate: 0, amount: 50, profit: 3200, status: '已返利', relation: '补发', codeAt: '', createdAt: '2026-10-20 15:00', paidAt: '2026-10-20 15:01', supplementName: '服务补偿', internalRemark: '客户反馈返利偏低，补发安抚', logs: [] as OpsLogRow[] },
        ],
        opsRate: [
            { id: 1, uid: '100237', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 8, amount: 0 }, { category: '道具', enabled: false, mode: 'rate', rate: 0, amount: 0 }] },
            { id: 2, uid: '100236', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 6, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 5 }] },
            { id: 3, uid: '100233', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 3, amount: 0 }, { category: '道具', enabled: false, mode: 'rate', rate: 0, amount: 0 }] },
        ],
        opsConfig: [{
            id: 1,
            settleHours: 24,
            profitThreshold: 5,
            audit: true,
            levels: [
                { id: 1, code: 'A', name: '一级代理', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 8, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 8 }] },
                { id: 2, code: 'B', name: '二级代理', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 5, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 6 }] },
                { id: 3, code: 'C', name: '三级代理', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 3, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 4 }] },
                { id: 4, code: 'D', name: '四级代理', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 2, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 2 }] },
                { id: 5, code: 'E', name: '五级代理', rules: [{ category: '账号', enabled: true, mode: 'rate', rate: 1, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 1 }] },
                { id: 6, code: 'F', name: '六级代理', rules: [{ category: '账号', enabled: false, mode: 'rate', rate: 0, amount: 0 }, { category: '道具', enabled: true, mode: 'fixed', rate: 0, amount: 5 }] },
            ],
        }],
    };

    /* ---------- 账户引用补齐 ----------
       商户与账户的 code 来自 biz 的种子（MC=收款渠道，PA=出款账户）。
       不往 goods() / order() 的长参数列表再补两项：位置参数已经十几个，
       再往后加极易错位；构造完再补也更方便只改某一条。 */
    seed.opsOrder?.forEach((o) => {
        // 线下单的钱进「银行卡对公」那条线下渠道；渠道单走微信主渠道
        o.recvChannel = o.orderType === '线下单' ? 'MC007' : 'MC001';
        // 已经交易完成（钱该出去了）的才有出款账户；没完成的本来就还没选
        if (o.doneAt) o.payoutAcct = 'PA001';
    });
    // 已售出的商品记下当时走的收款渠道；未售出的留空（还没收钱）
    seed.opsGoods?.forEach((g) => {
        if (g.status === '已售出') g.payChannel = 'MC001';
        /* 包赔费默认按「交易规则 → 包赔费」算（10%、最低 ¥10、最高 ¥1,000）。
           只把 5 号这一条勾成「免收」：编辑弹窗里才看得到勾选态与 ¥0 的样子，
           否则整页都是同一个状态，看不出这个开关有什么用。 */
        g.guarFree = g.id === 5;
    });
    /* 订单上的包赔费是下单那一刻的快照：跟着当时的商品勾选走，商品后来改了也不回写 */
    seed.opsOrder?.forEach((o) => {
        o.guarFree = seed.opsGoods?.find((g) => g.code === o.goodsCode)?.guarFree === true;
    });

    return seed;
}
