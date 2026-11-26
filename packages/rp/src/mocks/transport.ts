import { compare, hash, hashSync } from 'bcryptjs';
import { runtimeStorageId, runtimeVersion } from '@/prototype/runtime';
import { namespacePath } from '../../prototype/routes.mjs';
import { sitePath } from '@/prototype/catalog';
import { createSeed, timestamp, type Row } from './seed';
import { CSRF_COOKIE, getSession } from '@/utils/session';

function text(value: unknown): string {
    return typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

export const MOCK_STORAGE_KEY = `prototype_mock_${runtimeStorageId}`;
/**
 * 种子版本：**改种子数据也要 +1**，不只是加表。
 *
 * 加表时不升版本，旧缓存会让新页整页空表；改种子数据（例如把线下单从「已完成」
 * 调整为「已收货」）不升版本，浏览器会继续用旧值，页面按新规则判定的按钮就出不来。
 * 两种情况都是「代码对、测试过，只有浏览器看到的是旧数据」，极难从现象反推。
 *
 * 版本不符时直接回到种子，比逐个表补默认值可靠。
 */
export const MOCK_SCHEMA_VERSION = 15;
interface Database {
    version: number;
    tables: Record<string, Row[]>;
    preferences: unknown;
    favorites: number[];
    passwordHash: string;
    security: Record<string, unknown>;
    sequences: Record<string, number>;
}
// 仅本地 Mock：演示口令运行时散列，不将明文写入浏览器存储。
const defaultPasswordHash = hashSync('admin123', 10);
function initial(): Database {
    /* 种子里各表是模块级常量，`createSeed()` 每次返回的是**同一批数组引用**。
       直接交给数据库会让一次写入改到「下一次初始化的种子」—— 测试里表现为
       改了一条账户状态，下个用例读到的种子已经变了；真实场景里「重置数据」也拿不回原始值。
       深拷贝一份，每次初始化都是干净的。 */
    return { version: MOCK_SCHEMA_VERSION, tables: structuredClone(createSeed()), preferences: null, favorites: [], passwordHash: defaultPasswordHash, sequences: {},
        security: { passwordMinLength: 6, passwordMaxLength: 64, requireLower: false, requireUpper: false, requireDigit: false, requireSymbol: false, mfaEnabled: false, mfaRememberDays: 7, revision: 1 } };
}
/**
 * 缓存结构哨兵：版本号只能防「加表」，防不了「给已有的表加字段」。
 *
 * 给种子行补字段（例如 `opsUser.settlement`、`opsOrder.orderType`）而不升版本号时，
 * 浏览器里那份旧数据会被原样沿用 —— 新字段全是 undefined，表现就是「按钮不出现」
 * 「新列全是默认值」，而代码和测试都是对的，极难排查。这里直接看关键字段在不在。
 *
 * 表为空时视为合法：用户清空了某张表不该被判定为缓存过期。
 * 只能挑「每行都必有」的字段：像 `bizOrder.offlinePay` 只有线下单才有，
 * 拿它当哨兵会让缓存每次都被判过期，写入数据反复丢失。
 */
const SEED_SHAPE: [table: string, field: string][] = [
    ['opsUser', 'settlement'],
    ['opsOrder', 'orderType'],
    // 包赔费免收：旧缓存里没有这个字段，编辑弹窗会一直显示「按费率收」
    ['opsGoods', 'guarFree'],
];
function seedShapeOK(db: Database): boolean {
    return SEED_SHAPE.every(([table, field]) => {
        const rows = db.tables?.[table];
        if (!rows || rows.length === 0) return true;
        return Object.prototype.hasOwnProperty.call(rows[0], field);
    });
}
function read(): Database {
    try {
        let migrateStorage = false;
        let raw = localStorage.getItem(MOCK_STORAGE_KEY);
        // 工作构建首次迁移旧演示库，复制后独立保存；旧归档继续使用原键。
        if (raw === null && runtimeStorageId === `${runtimeVersion}-work`) {
            raw = localStorage.getItem(`prototype_mock_${runtimeVersion}`);
            migrateStorage = raw !== null; // 读取后统一迁移，避免再次复制旧明文凭据。
        }
        const saved = JSON.parse(raw || 'null') as (Database & { password?: string }) | null;
        if (saved?.version === MOCK_SCHEMA_VERSION && saved.tables?.user && saved.tables.menu && seedShapeOK(saved)) {
            if (saved.password !== undefined) {
                saved.passwordHash = hashSync(saved.password, 10);
                delete saved.password;
                migrateStorage = true;
            }
            if (!saved.passwordHash) saved.passwordHash = defaultPasswordHash;
            // 移除旧缓存中的内置编辑入口，不重置业务数据或其他菜单。
            saved.tables.menu = saved.tables.menu.filter((entry) => !(entry.path === '/rp/write' && entry.component === 'prototype/ProductRequestPage'));
            for (const entry of saved.tables.menu) if (typeof entry.path === 'string') { entry.path = namespacePath(entry.path); if (entry.type === 'directory' && entry.path === '/rp') entry.path = '/rp/navigation'; }
            // 仅迁移内置帮助入口，保留 ID、自定义菜单与全部业务数据。
            for (const entry of saved.tables.menu) if ((entry.component === 'help/HelpPage' || entry.type === 'directory') && typeof entry.path === 'string' && /^\/rp\/help(?:\/|$)/.test(entry.path)) entry.path = entry.path.replace('/rp/help', '/help');
            // 收敛内置入口，保留原地址和 ID，不重置用户演示数据或自定义菜单。
            const legacy = saved.tables.menu.find((entry) => entry.path === '/rp/workflow' && entry.component === 'prototype/WorkflowPage' && entry.title === '交接工作台');
            if (legacy) legacy.visible = false;
            for (const entry of saved.tables.menu) if (entry.path === '/rp/editor' && entry.component === 'prototype/VersionEditorPage') entry.title = '版本记录';
            // 版本协作使用公共首页布局；旧菜单记录仅用于链接兼容。
            for (const entry of saved.tables.menu) if (entry.path === '/rp/versions' && entry.component === 'prototype/VersionsPage') entry.visible = false;
            const docs = saved.tables.menu.find((entry) => entry.path === '/docs/' && entry.title === '使用文档' && entry.isExternal === true);
            if (docs && !saved.tables.menu.some((entry) => entry.path === '/help')) Object.assign(docs, { title: '使用指南', path: '/help', component: 'help/HelpPage', isExternal: false });
            // 新导览补入现有数据；不重排旧 ID，不清空业务表和自定义菜单。
            const seedMenus = createSeed().menu || [];
            for (const path of ['/manage', '/rp/components', '/help', '/rp/demo', '/versions']) {
                if (!saved.tables.menu.some((entry) => entry.path === path)) {
                    const node = seedMenus?.find((entry) => entry.path === path);
                    if (node) saved.tables.menu.push({ ...structuredClone(node), id: Math.max(0, ...saved.tables.menu.map((entry) => entry.id)) + 1 });
                }
            }
            // 指南入口改为目录；新增文章保留旧目录 ID 和全部业务数据。
            const guide = saved.tables.menu.find((entry) => entry.path === '/help' && (entry.component === 'help/HelpPage' || entry.type === 'directory'));
            const seedGuide = seedMenus.find((entry) => entry.path === '/help');
            if (guide && seedGuide) {
                Object.assign(guide, { title: '使用指南', type: 'directory', component: null, isExternal: false });
                for (const article of seedMenus.filter((entry) => entry.parentId === seedGuide.id)) {
                    const existing = saved.tables.menu.find((entry) => entry.path === article.path && entry.component === 'help/HelpPage');
                    if (existing) existing.parentId = guide.id;
                    else saved.tables.menu.push({ ...structuredClone(article), parentId: guide.id, id: Math.max(0, ...saved.tables.menu.map((entry) => entry.id)) + 1 });
                }
                for (const entry of saved.tables.menu) if (entry !== guide && entry.path === '/help' && entry.component === 'help/HelpPage') entry.visible = false;
            }
            saved.tables.menu = saved.tables.menu.filter((entry) => !(entry.path === '/rp/scenes' && entry.component === 'prototype/SceneGuidePage'));
            // 兼容曾同时保留旧文档和新指南的缓存；重复内置入口隐藏，记录与 ID 不删除。
            const builtins = new Set<string>();
            for (const entry of saved.tables.menu) {
                if (['/help', '/rp/scenes', '/manage'].includes(String(entry.path)) && ['help/HelpPage', 'prototype/SceneGuidePage', 'prototype/ManageGuidePage'].includes(String(entry.component))) {
                    const key = `${String(entry.path)}:${String(entry.component)}`;
                    if (builtins.has(key)) entry.visible = false;
                    else if (entry.visible !== false) builtins.add(key);
                }
                if (entry.path === '/rp' && entry.title === '工作台') entry.title = '协作首页';
                if (entry.path === '/manage/demo' && entry.title === '原型演示') entry.title = 'Semi 组件示例';
            }
            if (migrateStorage) persist(saved);
            return saved;
        }
    } catch { /* 无效数据回到种子。 */ }
    return initial();
}
function persist(db: Database) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db, (key, value: unknown) => /^(?:password|oldPassword|newPassword|confirmPassword|token|accessToken|refreshToken)$/i.test(key) ? undefined : value));
}
export function resetMockData() {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    document.cookie = `${CSRF_COOKIE}=; Max-Age=0; Path=/`;
    window.location.assign(sitePath('/manage/login'));
}
class MockError extends Error {
    constructor(message: string, readonly code = 100400, readonly status = 400) { super(message); }
}
const success = (data: unknown) => Response.json({ code: 0, message: '操作成功', data });
/** 运营后台演示用的「当前时间」，格式与种子数据一致（YYYY-MM-DD HH:mm） */
function nowText() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
/** 新返利单号：RBYYYYMMDD-8xxx */
function rebateCode(id: number) {
    return `RB${nowText().slice(0, 10).replace(/-/g, '')}-${String(8000 + id).padStart(4, '0')}`;
}
function tree(rows: Row[], region = false, parent: unknown = region ? null : 0): Row[] {
    return rows.filter((row) => (region ? row.parentCode : row.parentId) === parent).map((row) => ({
        ...row, children: tree(rows, region, region ? row.code : row.id),
    }));
}
function filtered(rows: Row[], params: URLSearchParams): Row[] {
    return rows.filter((row) => [...params].every(([key, value]) => {
        if (!value || ['page', 'pageSize', 'kinds'].includes(key)) return true;
        if (key === 'keyword') return ['name', 'title', 'username', 'nickname', 'phone', 'code', 'description', 'configKey', 'originalName'].some((field) => text(row[field]).toLowerCase().includes(value.toLowerCase()));
        if (key === 'userId') return String(row.id) === value;
        if (key === 'roleId') return Array.isArray(row.roleIds) && row.roleIds.includes(Number(value));
        const ranges: Record<string, [string, boolean]> = { createdStartTime: ['createdAt', true], createdEndTime: ['createdAt', false], lastLoginStartTime: ['lastLoginAt', true], lastLoginEndTime: ['lastLoginAt', false], startTime: ['createdAt', true], endTime: ['createdAt', false] };
        if (ranges[key]) { const [field, start] = ranges[key]; return !!row[field] && (start ? text(row[field]) >= value : text(row[field]) <= value); }
        return row[key] === undefined || text(row[key]) === value;
    }));
}
function page(rows: Row[], params: URLSearchParams) {
    const current = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.max(1, Number(params.get('pageSize')) || 20);
    return { list: rows.slice((current - 1) * pageSize, current * pageSize), total: rows.length, page: current, pageSize };
}
function requireRow(rows: Row[], id: number): Row {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new MockError('记录不存在', 100404, 404);
    return row;
}
const nextId = (rows: Row[]) => Math.max(0, ...rows.map((row) => row.id)) + 1;

/** 浏览器内传输层：不发网络请求，静态构建与开发使用相同的数据逻辑。 */
export async function mockFetch(input: string, options: RequestInit = {}): Promise<Response> {
    options.signal?.throwIfAborted();
    const url = new URL(input, 'http://prototype.local');
    const segments = url.pathname.split('/').filter(Boolean);
    const method = options.method || 'GET';
    const form = options.body instanceof FormData ? options.body : null;
    const body: Record<string, unknown> = typeof options.body === 'string' ? JSON.parse(options.body) as Record<string, unknown> : {};
    const db = read();
    const publicRoute = segments[1] === 'n';
    const parts = publicRoute ? segments.slice(2) : segments.slice(1);
    const [module, resource = '', action = '', rawId = '', childId = ''] = parts;
    const id = Number(rawId);
    let data: unknown = null;
    try {
        if (!publicRoute && !getSession()) throw new MockError('请先登录原型', 100101, 401);
        const rows = db.tables[resource] ?? [];
        const userId = Number(getSession()?.split('.')[0] || 1);
        const me = db.tables.user!.find((row) => row.id === userId) ?? db.tables.user![0]!;
        if (resource === 'auth') {
            switch (action) {
                case 'listProviders': data = { passwordLoginEnabled: true, phoneLoginEnabled: true, providers: [] }; break;
                case 'sendPhoneCode': case 'sendBindPhoneCode': break;
                case 'login': case 'loginWithPhoneCode': {
                    const user = db.tables.user!.find((row) => action === 'login' ? row.username === body.username : row.phone === body.phone);
                    if (!user || user.status !== 'enabled' || (action === 'login' ? !await compare(String(body.password ?? ''), db.passwordHash) : body.code !== '123456')) throw new MockError('账号或凭据错误', 110101, 401);
                    document.cookie = `${CSRF_COOKIE}=${user.id}.prototype; Path=/; SameSite=Lax`;
                    data = { userId: user.id, expiresIn: 86400, mfaRequired: false }; break;
                }
                case 'logout': data = { ssoLogoutUrl: null }; break;
                case 'getCurrentUser': data = { ...me, hasPassword: true, roles: me.roleNames, permissions: ['*'] }; break;
                case 'listCurrentMenus': data = tree(db.tables.menu!); break;
                case 'getPreferences': data = db.preferences; break;
                case 'updatePreferences': db.preferences = body; break;
                case 'listFavoriteMenus': data = db.favorites; break;
                case 'updateFavoriteMenus': db.favorites = [...new Set(body.menuIds as number[])].slice(0, 50); break;
                case 'updateProfile': Object.assign(me, body); break;
                case 'updateUsername': me.username = body.username; break;
                case 'bindPhone':
                    if (body.code !== '123456') throw new MockError('演示验证码为 123456');
                    me.phone = body.phone; break;
                case 'verifyPassword': case 'updatePassword':
                    if (!await compare(String(body.password ?? body.oldPassword ?? ''), db.passwordHash)) throw new MockError('密码错误', 110101, 401);
                    if (action === 'updatePassword') db.passwordHash = await hash(String(body.newPassword), 10);
                    break;
                case 'listCurrentIdentities': data = db.tables.identity!.filter((row) => row.userId === userId); break;
                case 'deleteCurrentIdentity': db.tables.identity = db.tables.identity!.filter((row) => row.id !== id); break;
                default: throw new MockError(`未实现的原型操作：${action}`, 100404, 404);
            }
        } else if (resource === 'security') {
            if (action === 'get') data = db.security;
            else if (action === 'updatePasswordRules') Object.assign(db.security, body, { passwordMinLength: body.minLength, passwordMaxLength: body.maxLength });
            else if (action === 'updateMfa') Object.assign(db.security, { mfaEnabled: body.enabled, mfaRememberDays: body.rememberDays });
            else throw new MockError('未知安全设置操作');
        } else if (module === 'ops') {
            // 示例商贸运营后台：商品 / 订单 / 用户 / 返利 / 返利配置
            const tableOf: Record<string, string> = { goods: 'opsGoods', order: 'opsOrder', user: 'opsUser', rebate: 'opsRebate', rate: 'opsRate', config: 'opsConfig' };
            const table = tableOf[resource];
            if (!table) throw new MockError(`未知运营模块：${resource}`, 100404, 404);
            const opsRows = db.tables[table] ?? [];
            const searchFields: Record<string, string[]> = {
                goods: ['code', 'title', 'account', 'userId', 'game', 'region', 'server'],
                order: ['code', 'goodsCode', 'buyerUid', 'sellerUid', 'account', 'title', 'game', 'region', 'server'],
                user: ['uid', 'displayId', 'nickname', 'phone', 'realName', 'idcard'],
                rebate: ['code', 'orderCode', 'buyerUid', 'inviterUid'],
            };
            const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase();
            const ignore = ['page', 'pageSize', 'keyword', 'sort'];
            const filters = [...url.searchParams].filter(([key]) => !ignore.includes(key));
            // 状态由页签单独过滤：先算各状态数量，再按当前页签取数
            const base = opsRows.filter((row) => {
                const hitKeyword = !keyword || (searchFields[resource] ?? []).some((field) => text(row[field]).toLowerCase().includes(keyword));
                return hitKeyword && filters.every(([key, value]) => key === 'status' || !value || text(row[key]) === value);
            });
            const counts = base.reduce<Record<string, number>>((acc, row) => {
                const key = text(row.status);
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
            }, {});
            const pick = () => requireRow(opsRows, id);
            const addLog = (row: Row, actionName: string, remark: string) => {
                const logs = Array.isArray(row.logs) ? row.logs as Record<string, string>[] : [];
                row.logs = [...logs, { time: nowText(), action: actionName, operator: '运营-后台', remark }];
            };
            switch (action) {
                case 'list': {
                    if (resource === 'config') { data = opsRows[0] ?? null; break; }
                    const status = url.searchParams.get('status') ?? '';
                    let selected = status ? base.filter((row) => text(row.status) === status) : base;
                    if (url.searchParams.get('sort') === 'gmv') {
                        const gmv = (row: Row) => (Array.isArray(row.inviteUsers) ? row.inviteUsers as { gmv?: number }[] : []).reduce((sum, item) => sum + (item.gmv ?? 0), 0);
                        selected = [...selected].sort((a, b) => gmv(b) - gmv(a));
                    }
                    data = { ...page(selected, url.searchParams), counts };
                    break;
                }
                case 'get': data = pick(); break;
                case 'update': Object.assign(pick(), body); break;
                case 'setStatus': {
                    const row = pick();
                    const status = text(body.status);
                    row.status = status;
                    if (status === '已上架') { row.onAt = nowText(); row.offAt = ''; }
                    if (status === '已下架') row.offAt = nowText();
                    if (status === '已删除') row.deletedAt = nowText();
                    addLog(row, text(body.logAction) || '商品状态变更', text(body.remark));
                    break;
                }
                case 'pay': {
                    const row = pick();
                    row.buyerUid = text(body.buyerUid);
                    // 收款商户必选：钱从哪条路进来是这一笔支付的一部分，不记下来事后对不上账
                    row.payChannel = text(body.payChannel);
                    row.status = '已售出';
                    row.soldAt = nowText();
                    row.offAt = '';
                    addLog(row, '商品支付', text(body.remark));
                    break;
                }
                case 'assignSeller': {
                    const row = pick();
                    row.userId = text(body.userId);
                    addLog(row, '设置卖家', text(body.remark));
                    break;
                }
                case 'addLog': addLog(pick(), text(body.actionName) || '操作', text(body.remark)); break;
                case 'toOffline': {
                    /* 待支付的渠道单转线下单：买家没走渠道支付（例如自己去微信转了），
                       改由运营线下收款 + 登记打款。
                       四样必须落下来 —— 收款商户（钱进了谁的户）、付款凭证（没有渠道回执，凭证就是凭据）、
                       实收金额（实际到手多少）、支付完成时间（钱是什么时候到的，由客服填）。
                       少任何一样，这笔钱在账上就说不清。 */
                    const row = pick();
                    row.orderType = '线下单';
                    row.status = '已支付';
                    // 支付时间用客服填的那个；没填才退回当前时间
                    row.paidAt = text(body.payAt) || nowText();
                    row.offlinePay = { state: 'todo', at: '', no: '', by: '', proof: '' };
                    if (text(body.recvChannel)) row.recvChannel = text(body.recvChannel);
                    // 实收金额可能与订单金额不同（差额另走改价），单独记一笔
                    const received = Number(body.amt);
                    if (Number.isFinite(received) && received > 0) row.receivedAmt = received;
                    if (text(body.proof)) row.recvProof = text(body.proof);
                    /* 包赔费快照跟着商品当下的勾选走：这一单收不收包赔费，是下单那一刻定的，
                       商品后面改了勾选也不回写 —— 与费率快照同一个口径。 */
                    row.guarFree = db.tables.opsGoods?.find((g) => g.code === row.goodsCode)?.guarFree === true;
                    addLog(row, '转线下单', text(body.remark) || '买家未走渠道支付，转为线下单');
                    break;
                }
                case 'offlinePay': {
                    // 线下单不走渠道代付，钱从运营自有账户打出 —— 凭证就是回执。
                    // 买家已收货才允许打款；钱一打出去这笔交易即告结束，状态推到「已完成」。
                    const row = pick();
                    row.offlinePay = { state: 'done', at: text(body.at), no: text(body.no),
                        by: text(body.by), proof: text(body.proof) };
                    row.status = '已完成';
                    row.doneAt = text(body.at) || nowText();
                    // 出款账户也落在这张单上：钱打出去之后要能回答「从哪个号出的」
                    if (text(body.payoutAcct)) row.payoutAcct = text(body.payoutAcct);
                    addLog(row, '登记打款', `打款流水号 ${text(body.no)}，凭证 ${text(body.proof)}，订单转为已完成`);
                    break;
                }
                case 'setUserStatus': {
                    const row = pick();
                    row.status = text(body.status);
                    addLog(row, text(body.logAction) || '账号状态变更', text(body.remark));
                    break;
                }
                case 'setUserLevel': {
                    const uid = text(body.uid);
                    const row = (db.tables.opsUser ?? []).find((item) => text(item.uid) === uid);
                    if (!row) throw new MockError('用户不存在，请核对用户ID');
                    const before = text(row.level);
                    const after = text(body.level);
                    row.level = after;
                    addLog(row, '调整代理等级', `代理等级由 ${before || '无等级'} 调整为 ${after || '无等级'}`);
                    break;
                }
                case 'adjustAmount': {
                    const row = pick();
                    const before = Number(row.amount);
                    row.amount = Number(body.amount);
                    addLog(row, '修改返利金额', `返利金额由 ¥${before.toFixed(2)} 调整为 ¥${Number(row.amount).toFixed(2)}`);
                    break;
                }
                case 'pass': {
                    const row = pick();
                    row.status = '已返利';
                    row.paidAt = nowText();
                    addLog(row, '确认返利', text(body.remark));
                    break;
                }
                case 'createRate': {
                    if (opsRows.some((row) => text(row.uid) === text(body.uid))) throw new MockError('该用户已有专属比例，请直接编辑');
                    const record: Row = { ...body, id: nextId(opsRows) };
                    opsRows.push(record); db.tables.opsRate = opsRows; data = { id: record.id };
                    break;
                }
                case 'updateRate': Object.assign(pick(), body); break;
                case 'deleteRate': db.tables.opsRate = opsRows.filter((row) => row.id !== id); break;
                case 'saveConfig': Object.assign(opsRows[0] ?? { id: 1 }, body); break;
                case 'saveLevel': {
                    const config = opsRows[0] ?? { id: 1 };
                    const levels = (Array.isArray(config.levels) ? config.levels : []) as Row[];
                    const levelId = Number(body.id ?? 0);
                    if (levelId) {
                        const level = levels.find((item) => item.id === levelId);
                        if (!level) throw new MockError('等级不存在', 100404, 404);
                        Object.assign(level, { code: text(body.code), name: text(body.name), rules: body.rules });
                    } else {
                        levels.push({ id: nextId(levels), code: text(body.code), name: text(body.name), rules: body.rules });
                    }
                    config.levels = levels;
                    db.tables.opsConfig = [config];
                    break;
                }
                case 'deleteLevel': {
                    const config = opsRows[0];
                    if (config) config.levels = ((Array.isArray(config.levels) ? config.levels : []) as Row[]).filter((item) => item.id !== id);
                    break;
                }
                case 'createRebate': {
                    const order = (db.tables.opsOrder ?? []).find((item) => text(item.code) === text(body.orderCode));
                    if (!order) throw new MockError('订单不存在，请核对订单编号');
                    const amount = Number(body.amount);
                    if (!(amount > 0)) throw new MockError('返利金额需大于 0');
                    const uid = text(body.inviterUid);
                    if (!uid) throw new MockError('请选择返利对象');
                    const config = (db.tables.opsConfig?.[0] ?? {}) as Row;
                    const user = (db.tables.opsUser ?? []).find((item) => text(item.uid) === uid);
                    const audit = config.audit !== false;
                    const now = nowText();
                    const record: Row = {
                        ...body, id: nextId(opsRows), code: rebateCode(nextId(opsRows)), orderCode: text(order.code),
                        buyerUid: text(order.buyerUid), inviterUid: uid, price: Number(order.price),
                        category: text(body.category) || '账号', level: text(user?.level),
                        origin: '手动', mode: 'fixed', rate: 0, amount, profit: Number(body.profit ?? 0),
                        status: audit ? '待审核' : '已返利', relation: '客服补录', codeAt: '', createdAt: now,
                        paidAt: audit ? '' : now, supplementName: '', internalRemark: text(body.internalRemark),
                        logs: [{ time: now, action: '手动新增返利', operator: '运营-后台', remark: text(body.internalRemark) || `客服补录返利 ${amount} 元` }],
                    };
                    opsRows.push(record);
                    db.tables.opsRebate = opsRows;
                    data = { id: record.id, code: record.code };
                    break;
                }
                default: throw new MockError(`未实现的运营操作：${action}`, 100404, 404);
            }
        } else if (resource === 'media') {
            if (action === 'getUploadSettings') {
                const value = (key: string, fallback: string) => text(db.tables.config!.find((row) => row.configKey === `system.upload.${key}`)?.configValue ?? fallback);
                data = Object.fromEntries(['image', 'video', 'file'].flatMap((kind) => [[`${kind}Formats`, value(`${kind}_formats`, 'txt').split(',')], [`${kind}MaxSizeMb`, Number(value(`${kind}_max_size_mb`, '20'))]]));
            } else if (action === 'getDirectUploadAuthorization') data = null;
            else if (action === 'uploadFile') {
                const file = form?.get('file');
                if (!(file instanceof File)) throw new MockError('请选择文件');
                if (file.size > 3 * 1024 * 1024) throw new MockError('原型本地预览最多支持 3 MB 文件');
                const content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader(); reader.onload = () => resolve(text(reader.result)); reader.onerror = () => reject(new Error('文件读取失败')); reader.readAsDataURL(file);
                });
                const fileId = nextId(db.tables.mediaLibrary!);
                data = { url: content, name: file.name, path: `mock/${fileId}/${file.name}`, size: file.size };
                db.tables.mediaLibrary!.push({ id: fileId, originalName: file.name, url: content, size: file.size, createdAt: timestamp, category: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.name.endsWith('.zip') ? 'archive' : 'document', references: [] });
            } else throw new MockError('未知上传操作');
        } else if (resource === 'sequence') {
            const type = String(body.type); db.sequences[type] = (db.sequences[type] ?? 0) + 1;
            data = { id: Object.keys(db.sequences).indexOf(type) + 1, type, sequence: db.sequences[type] };
        } else if (resource === 'batchJob') {
            if (action === 'list') data = rows.filter((row) => !url.searchParams.get('kinds') || url.searchParams.get('kinds')!.split(',').includes(String(row.kind)));
            else if (action === 'create') {
                const file = form?.get('file');
                if (!(file instanceof File)) throw new MockError('请选择文件');
                data = { id: nextId(rows), kind: form?.get('kind'), sourceName: file.name, status: 'succeeded', phase: 'finished', total: 3, selectedCount: 3, processed: 3, succeeded: 3, failed: 0, errorMessage: null, decidedAt: timestamp, createdAt: timestamp, finishedAt: timestamp };
                rows.unshift(data as Row);
            } else if (action === 'get') data = requireRow(rows, id);
            else if (action === 'cancel') { data = requireRow(rows, id); Object.assign(data!, { status: 'cancelled', phase: 'finished' }); }
            else if (action === 'listDetails') data = page(Array.from({ length: 3 }, (_, i) => ({ id: i + 1, itemNo: i + 1, itemName: `模拟条目 ${i + 1}`, stage: url.searchParams.get('stage') || 'processing', status: 'succeeded', message: '模拟处理完成', sourceLocation: `第 ${i + 1} 行`, displayData: '{"name":"演示条目"}', createdAt: timestamp })), url.searchParams);
            else throw new MockError('未知批处理操作');
        } else if (module === 'demo' && resource === 'batchItem' && action === 'list') {
            data = page(Array.from({ length: 3 }, (_, i) => ({ id: i + 1, itemNo: i + 1, itemName: `演示条目 ${i + 1}`, itemValue: `value-${i + 1}` })), url.searchParams);
        } else if (resource === 'config' && action.endsWith('Group') || resource === 'config' && action === 'listGroups') {
            const groups = db.tables.configGroup!;
            const group = groups.find((row) => row.key === rawId);
            if (action === 'listGroups') data = groups;
            else if (action === 'createGroup') { const record = { ...body, id: nextId(groups), groupKey: body.groupKey || 'config_system', canDelete: true, isBuiltin: false, createdAt: timestamp }; groups.push(record); data = { id: record.id }; }
            else if (!group) throw new MockError('分组不存在');
            else if (action === 'updateGroup') Object.assign(group, body);
            else if (action === 'deleteGroup') { if (db.tables.config!.some((row) => row.groupKey === rawId)) throw new MockError('请先删除分组内配置'); db.tables.configGroup = groups.filter((row) => row !== group); }
        } else if (resource === 'dict' && /Item/.test(action)) {
            const items = db.tables.dictItem!;
            const dict = db.tables.dict!.find((row) => action === 'listItemsByCode' ? row.code === decodeURIComponent(rawId) : row.id === id);
            if (action.startsWith('list')) data = items.filter((row) => row.dictId === dict?.id);
            else if (action === 'createItem') { const record = { ...body, dictId: id, id: nextId(items), status: body.status || 'enabled' }; items.push(record); data = { id: record.id }; }
            else if (action === 'updateItem') Object.assign(requireRow(items, Number(childId)), body);
            else if (action === 'deleteItem') db.tables.dictItem = items.filter((row) => row.id !== Number(childId));
        } else if (resource === 'user' && action.includes('Identit')) {
            const identities = db.tables.identity!;
            if (action === 'listIdentities') data = identities.filter((row) => row.userId === id);
            else if (action === 'createIdentity') { const record = { ...body, id: nextId(identities), userId: id, providerName: body.provider, createdAt: timestamp }; identities.push(record); data = { id: record.id }; }
            else if (action === 'deleteIdentity') db.tables.identity = identities.filter((row) => row.id !== Number(childId));
        } else if (db.tables[resource]) {
            const selection = filtered(rows, url.searchParams);
            switch (action) {
                case 'list': data = resource === 'menu' ? tree(rows) : resource === 'batchJob' || resource === 'area' ? selection : page(selection, url.searchParams); break;
                case 'listAll': case 'listOptions': data = selection; break;
                case 'listTree': case 'getEnabledTree': {
                    const selected = action === 'getEnabledTree' ? rows.filter((row) => row.status === 'enabled') : [...selection];
                    if (action === 'listTree') {
                        for (let cursor = 0; cursor < selected.length; cursor++) {
                            const parent = rows.find((row) => row.code === selected[cursor]!.parentCode);
                            if (parent && !selected.includes(parent)) selected.push(parent);
                        }
                    }
                    data = tree(selected, true); break;
                }
                case 'get': data = requireRow(rows, id); break;
                case 'export': {
                    const cell = (value: unknown) => `"${text(value).replaceAll('"', '""')}"`;
                    return new Response('\ufeffcode,name,level,parentCode\n' + selection.map((row) => [row.code, row.name, row.level, row.parentCode].map(cell).join(',')).join('\n'), { headers: { 'Content-Type': 'text/csv;charset=utf-8' } });
                }
                case 'create': {
                    if (['user', 'role', 'dict', 'area'].includes(resource) && rows.some((row) => (body.username && row.username === body.username) || (body.code && row.code === body.code))) throw new MockError('名称或编码已存在');
                    const record: Row = { status: 'enabled', isBuiltin: false, roleIds: [], roleNames: [], children: [], parentId: 0, visible: true, keepAlive: false, isExternal: false, sort: 0, createdAt: timestamp, updatedAt: timestamp, ...body, id: nextId(rows) };
                    if (resource === 'user') record.roleNames = db.tables.role!.filter((role) => (body.roleIds as number[]).includes(role.id)).map((role) => role.name);
                    rows.push(record); data = resource === 'area' ? record : { id: record.id }; break;
                }
                case 'update': {
                    const record = requireRow(rows, id);
                    /* ---------- 账户状态 → 出款 / 收款的开关（2026-11-16） ----------
                       主体异常或冻结时，线上那一层就收不进钱、打不出款，
                       所以：① 不允许开启；② 已经开着的自动关掉。
                       **只作用于线上**：线下走人工转账 / 平台店铺走款，不看渠道健康度，
                       账户状态不该把线下也一起停掉（业务口径见「异常只影响线上」）。 */
                    const acctBad = (code: unknown): string => {
                        const acct = (db.tables.bizAccount ?? []).find((row) => row.code === code);
                        if (!acct) return '账户不存在';
                        if (acct.frozen) return '已冻结';
                        if (!acct.normal) return '账户异常';
                        return '';
                    };
                    if (resource === 'bizPayoutAccount' && body.wd === true) {
                        const bad = record.online === true ? acctBad(record.acct) : '';
                        if (bad) throw new MockError(`主体${bad}，不能开启这条出款账户 —— 先到「账户管理」恢复正常或解冻`);
                    }
                    if (resource === 'bizChannel' && body.on === true) {
                        const bad = record.online === true ? acctBad(record.acct) : '';
                        if (bad) throw new MockError(`主体${bad}，不能开启这条收款渠道 —— 先到「账户管理」恢复正常或解冻`);
                    }
                    if (resource === 'menu' && body.parentId !== undefined) {
                        let parent = rows.find((row) => row.id === body.parentId);
                        const seen = new Set<number>();
                        while (parent) {
                            if (parent.id === id || seen.has(parent.id)) throw new MockError('不能将菜单移入自身或子菜单');
                            seen.add(parent.id); parent = rows.find((row) => row.id === parent!.parentId);
                        }
                    }
                    Object.assign(record, body, { updatedAt: timestamp });
                    /* 账户被置为异常 / 冻结时，引用它的**线上**出款账户与收款渠道立刻关闭：
                       钱已经收不进、打不出了，开关还亮着只会让人以为一切正常。 */
                    if (resource === 'bizAccount') {
                        const bad = acctBad(record.code);
                        if (bad) {
                            for (const po of db.tables.bizPayoutAccount ?? []) {
                                if (po.acct === record.code && po.online === true && po.wd) po.wd = false;
                            }
                            for (const ch of db.tables.bizChannel ?? []) {
                                if (ch.acct === record.code && ch.online === true && ch.on) ch.on = false;
                            }
                        }
                    }
                    if (resource === 'user' && Array.isArray(body.roleIds)) record.roleNames = db.tables.role!.filter((role) => (body.roleIds as number[]).includes(role.id)).map((role) => role.name);
                    data = resource === 'area' ? record : null; break;
                }
                case 'assignMenus': requireRow(rows, id).menuIds = body.menuIds; break;
                case 'updateAccountField': requireRow(rows, id)[String(body.field)] = body.value; break;
                case 'updatePassword': if (id === 1) db.passwordHash = await hash(String(body.password), 10); break;
                case 'delete':
                    if (requireRow(rows, id).isBuiltin) throw new MockError('内置记录不能删除');
                    if (resource === 'menu' && rows.some((row) => row.parentId === id)) throw new MockError('请先删除子菜单');
                    if (resource === 'area' && rows.some((row) => row.parentCode === requireRow(rows, id).code)) throw new MockError('请先删除下级地区');
                    if (resource === 'dict') db.tables.dictItem = db.tables.dictItem!.filter((row) => row.dictId !== id);
                    db.tables[resource] = rows.filter((row) => row.id !== id); break;
                default: throw new MockError(`未实现的原型操作：${url.pathname}`, 100404, 404);
            }
        } else throw new MockError(`未配置的 Mock 路径：${url.pathname}`, 100404, 404);
        if (method !== 'GET') persist(db);
        return success(data);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        const failure = error instanceof MockError ? error : new MockError(error instanceof DOMException && error.name === 'QuotaExceededError' ? '浏览器存储空间不足，请删除部分资源或重置 Mock' : '原型操作失败，请检查 Mock 数据');
        return Response.json({ code: failure.code, message: failure.message, data: null }, { status: failure.status });
    }
}
