import type { DemoSchema } from './DemoParameters';
import type { PrototypeDemoKey } from './component-catalog';
const release = { id: 'v1.1', title: '自定义原型', status: 'in_progress', baseline: null, date: '2026-11-26', goal: '参数化展示', changes: [] };
const page = { id: 'sample', title: '本地示例页面', path: '/sample', module: '示例模块', platform: 'manage' };
const validateVersion = (args: Record<string, unknown>) => {
    const version = (args.release ?? args.version) as typeof release | undefined;
    if (version && (!/^v\d+\.\d+(?:\.\d+)?$/.test(version.id) || !['in_progress', 'completed'].includes(version.status))) throw new Error('版本 id 应为 v1.1 格式，status 应为 in_progress 或 completed');
};
export const prototypeParameterSchemas: Record<Exclude<PrototypeDemoKey, 'all'>, DemoSchema> = {
    'scope-switch': { defaults: { value: 'all' }, choices: { value: ['all', 'version'] } },
    entry: { defaults: { kind: 'manage', to: '/example/manage', children: '自定义入口' }, choices: { kind: ['manage', 'mobile', 'changes'] } },
    'updated-at': { defaults: { updatedAt: '2026-11-26T12:00:00+08:00', timeZone: 'Asia/Shanghai' }, validate: args => { if (!Number.isFinite(new Date(String(args.updatedAt)).getTime())) throw new Error('updatedAt 应为有效日期'); try { new Intl.DateTimeFormat('zh-CN', { timeZone: String(args.timeZone) }); } catch { throw new Error('timeZone 应为有效 IANA 时区'); } } },
    'page-identity': { defaults: { release, page: { id: page.id, title: page.title }, path: page.path, platform: 'manage' }, choices: { platform: ['manage', 'mobile'] }, validate: validateVersion },
    'quick-search': { defaults: { pages: [{ ...page, keywords: '示例 demo 页面' }], locked: false } },
    'version-overview': { defaults: { baseline: 'v1.0', date: '2026-11-26', pages: 2, changes: 3 } },
    'page-directory': { defaults: { version: 'v1.1', full: true, pages: [{ id: page.id, title: page.title, path: page.path, module: page.module, changes: [{ id: 'CHG-001', title: '调整示例' }], href: '', unavailable: '没有可用构建', removed: false }] } },
    'review-form': { defaults: { version: release, pages: [page], initialPageId: 'sample' }, validate: validateVersion },
    'page-review': { defaults: { release, page: { ...page, files: [] }, pages: [page], locked: false, reviewPath: '#demo-review-records', notes: [{ id: 'review-1', versionId: 'v1.1', pageId: 'sample', platform: 'manage', pageTitle: page.title, author: '产品', text: '请调整示例标题', date: '2026-11-26T12:00:00Z' }] }, validate: validateVersion },
};

const presets: Record<Exclude<PrototypeDemoKey, 'all'>, NonNullable<DemoSchema['presets']>> = {
    'scope-switch': [{ label: '版本改动', values: { value: 'version' } }],
    entry: [{ label: '手机端入口', values: { kind: 'mobile', to: '/example/mobile', children: '访问手机端' } }, { label: '版本改动入口', values: { kind: 'changes', to: '/example/changes', children: '查看版本改动' } }],
    'updated-at': [{ label: 'UTC 时区', values: { timeZone: 'UTC' } }, { label: '纽约时区', values: { timeZone: 'America/New_York' } }],
    'page-identity': [{ label: '手机端页面', values: { platform: 'mobile', path: '/orders', page: { id: 'orders', title: '订单列表' } } }, { label: '已完结版本', values: { release: { ...release, status: 'completed' } } }],
    'quick-search': [{ label: '空页面目录', values: { pages: [] } }, { label: '锁定入口', values: { locked: true } }, { label: '多页面搜索', values: { pages: [{ ...page, keywords: '示例 demo' }, { ...page, id: 'orders', title: '订单列表', path: '/orders', keywords: '订单 order' }] } }],
    'version-overview': [{ label: '初始版本 · 无改动', values: { baseline: '初始基线', pages: 0, changes: 0 } }, { label: '多页面版本', values: { pages: 24, changes: 8 } }],
    'page-directory': [{ label: '版本改动范围', values: { full: false } }, { label: '空目录', values: { pages: [] } }],
    'review-form': [{ label: '整版评审', values: { pages: [], initialPageId: '' } }, { label: '已完结版本', values: { version: { ...release, status: 'completed' } } }],
    'page-review': [{ label: '无评审记录', values: { notes: [] } }, { label: '锁定评审', values: { locked: true } }, { label: '已完结版本', values: { release: { ...release, status: 'completed' } } }],
};
for (const key of Object.keys(prototypeParameterSchemas) as Exclude<PrototypeDemoKey, 'all'>[]) prototypeParameterSchemas[key].presets = presets[key];
