import { randomBytes } from 'node:crypto';

/** Isolated protocol substitute. It does not establish real backend correctness. */
export function createApiModel() {
    const db = { user: [{ id: 1, version: 0, username: 'api_admin', nickname: 'Synthetic admin', password: 'synthetic-admin-password', status: 'enabled', isBuiltin: true, roleIds: [] }],
        role: [], menu: [{ id: 10, version: 0, parentId: 0, title: 'Users', path: '/system/users', type: 'menu', permission: 'system:user:list', status: 'enabled', children: [] }],
        dict: [], dictItem: [], configGroup: [{ id: 2, groupKey: 'config_system', key: 'general', label: 'General', isBuiltin: true }],
        config: [{ id: 3, configKey: 'system.general.title', configValue: 'Synthetic', configType: 'string', groupKey: 'general', fieldType: 'text', isBuiltin: true }], loginLog: [], operationLog: [] };
    const sessions = new Map(), calls = [], fault = { badCode: false, missingTotal: false, badTree: false, staleUpdateAccepted: false,
        revokeIgnored: false, failDelete: false, failLogout: false, dropCreate: false, forceSnapshotMismatch: false };
    let sequence = 100, revision = 1;
    const response = (status, code, data = null, headers = new Headers()) => ({ status, payload: { code, message: code === 0 ? 'ok' : 'synthetic failure', data }, headers });
    const success = (data = null) => response(200, fault.badCode ? '0' : 0, data);
    const failure = (status, code) => response(status, code);
    const publicUser = (user) => { const { password, ...view } = user; return view; };
    const rolePermissions = (user) => user.id === 1 ? ['*'] : [...new Set(db.role.filter((role) => role.status === 'enabled' && user.roleIds.includes(role.id))
        .flatMap((role) => role.menuIds.flatMap((mid) => db.menu.filter((menu) => menu.id === mid && menu.status === 'enabled').map((menu) => menu.permission).filter(Boolean))))];
    const profile = (user) => ({ id: user.id, username: user.username, nickname: user.nickname,
        roles: user.id === 1 ? ['super_admin'] : db.role.filter((role) => user.roleIds.includes(role.id)).map((role) => role.code), permissions: rolePermissions(user) });
    const page = (rows, query) => {
        const current = Math.max(1, Number(query.get('page') ?? 1));
        const input = Number(query.get('pageSize') ?? 20), size = Math.min(input < 1 ? 20 : input, 200);
        const keyword = query.get('keyword');
        const selected = rows.filter((row) => !keyword || [row.username, row.nickname, row.code, row.name, row.configKey].some((v) => v?.includes(keyword)));
        const value = { list: selected.slice((current - 1) * size, current * size), total: selected.length, page: current, pageSize: size };
        if (fault.missingTotal) delete value.total;
        return value;
    };
    const menuTree = (parentId = 0) => db.menu.filter((row) => row.parentId === parentId).map((row) => ({ ...row, parentId: fault.badTree ? -1 : row.parentId, children: menuTree(row.id) }));
    const region = { id: 20, code: '110000', name: 'Synthetic region', parentCode: null, level: 'province', status: 'enabled', sort: 0, children: [] };
    async function dispatch(urlValue, options = {}) {
        const url = new URL(urlValue), route = url.pathname, method = options.method ?? 'GET';
        const headers = new Headers(options.headers);
        const data = options.body ? JSON.parse(options.body) : undefined;
        calls.push({ route, method, csrf: headers.has('x-csrf-token'), authenticated: headers.has('cookie') });
        if (route === '/api-backend/n/health') return success({ status: 'UP' });
        if (route === '/api-backend/n/region/area/getEnabledTree') return success([region]);
        if (route.startsWith('/api-backend/n/system/config/getPublic/')) {
            if (decodeURIComponent(route.split('/').at(-1)) !== 'system.general.title') return failure(403, 100102);
            return success({ configKey: 'system.general.title', configValue: 'Synthetic' });
        }
        if (route === '/api-backend/n/system/auth/login') {
            const user = db.user.find((row) => row.username === data?.username && row.password === data?.password && row.status === 'enabled');
            if (!user) return failure(401, 110101);
            const token = randomBytes(12).toString('hex'); sessions.set(token, user.id);
            const cookies = new Headers();
            cookies.append('set-cookie', `weiran_token=${token}; Path=/api-backend; HttpOnly; SameSite=Strict; Max-Age=3600`);
            cookies.append('set-cookie', `weiran_csrf=${user.id}.synthetic-csrf; Path=/; SameSite=Strict; Max-Age=3600`);
            return response(200, 0, { mfaRequired: false, userId: user.id }, cookies);
        }
        const cookie = Object.fromEntries((headers.get('cookie') ?? '').split(';').map((part) => part.trim().split('=')));
        const user = db.user.find((row) => row.id === sessions.get(cookie.weiran_token) && row.status === 'enabled');
        if (!user) return failure(401, 100101);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && headers.get('x-csrf-token') !== cookie.weiran_csrf) return failure(403, 100103);
        if (route.endsWith('/auth/logout')) {
            if (fault.failLogout) return failure(500, 100005);
            const cookies = new Headers();
            cookies.append('set-cookie', 'weiran_token=; Path=/api-backend; HttpOnly; SameSite=Strict; Max-Age=0');
            cookies.append('set-cookie', 'weiran_csrf=; Path=/; SameSite=Strict; Max-Age=0');
            return response(200, 0, null, cookies);
        }
        if (route.endsWith('/auth/getCurrentUser')) return success(profile(user));
        if (route.endsWith('/auth/getAuthorizationSnapshot')) return success({ user: { ...profile(user), ...(fault.forceSnapshotMismatch ? { id: 999 } : {}) }, menus: [], revision: String(revision) });
        if (route.startsWith('/api-backend/region/area/')) {
            if (!rolePermissions(user).includes('*') && !route.endsWith('/getEnabledTree')) return failure(403, 100102);
            if (/\/get\/\d+$/.test(route)) return Number(route.split('/').at(-1)) === region.id ? success(region) : failure(404, 100002);
            return success(route.endsWith('/list') ? [{ ...region, children: undefined }] : [region]);
        }
        const match = /^\/api-backend\/system\/(user|role|menu|dict|config|loginLog|operationLog)\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(route);
        if (!match) return failure(404, 100002);
        const [, type, action, rawId, childId] = match;
        const required = `system:${type === 'loginLog' ? 'login-log' : type === 'operationLog' ? 'operation-log' : type}:list`;
        const granted = rolePermissions(user);
        if (!granted.includes('*') && !granted.includes(required)) return failure(403, 100102);
        if (method === 'GET') {
            if (url.searchParams.has('page') && !Number.isFinite(Number(url.searchParams.get('page')))) return failure(400, 100001);
            if (action === 'list') return success(type === 'menu' ? menuTree() : page(db[type].map((r) => type === 'user' ? publicUser(r) : r), url.searchParams));
            if (action === 'listOptions') return success(db[type].map((r) => type === 'user' ? publicUser(r) : r));
            if (action === 'listGroups') return success(db.configGroup);
            if (action === 'listAll') return success(db.config);
            if (action === 'listItems' || action === 'listItemsByCode') {
                const dictId = action === 'listItems' ? Number(rawId) : db.dict.find((r) => r.code === rawId)?.id;
                if (!db.dict.some((row) => row.id === dictId)) return failure(404, 100002);
                return success(db.dictItem.filter((r) => r.dictId === dictId && (action === 'listItems' || r.status === 'enabled')).sort((a, b) => action === 'listItems' ? b.id - a.id : a.sort - b.sort || a.id - b.id));
            }
            if (action === 'get') {
                const row = db[type].find((r) => r.id === Number(rawId));
                return row ? success(type === 'user' ? publicUser(row) : row) : failure(404, 100002);
            }
        }
        if (['loginLog', 'operationLog'].includes(type)) return failure(404, 100002);
        if (action === 'create' || action === 'createGroup' || action === 'createItem') {
            const target = action === 'createGroup' ? 'configGroup' : action === 'createItem' ? 'dictItem' : type;
            const key = { user: 'username', role: 'code', menu: 'path', dict: 'code', config: 'configKey', configGroup: 'key', dictItem: 'value' }[target];
            if (db[target].some((r) => r[key] === data[key] && (target !== 'dictItem' || r.dictId === Number(rawId)))) return failure(409, 100003);
            if (target === 'user' && (!data.nickname || !Array.isArray(data.roleIds)) || target === 'role' && !/^[a-z][a-z0-9_]*$/.test(data.code)) return failure(400, 100001);
            const row = { ...data, id: ++sequence, isBuiltin: false, version: 0, status: data.status ?? 'enabled', sort: data.sort ?? 0 };
            if (target === 'role') row.menuIds = [];
            if (target === 'configGroup') row.groupKey = data.groupKey ?? 'config_system';
            if (target === 'dictItem') row.dictId = Number(rawId);
            db[target].push(row); revision++;
            if (fault.dropCreate) { fault.dropCreate = false; throw new Error('synthetic dropped response'); }
            return success({ id: row.id });
        }
        if (action === 'update' || action === 'updateItem' || action === 'updateGroup' || action === 'assignMenus') {
            const target = action === 'updateGroup' ? 'configGroup' : action === 'updateItem' ? 'dictItem' : type;
            const row = db[target].find((r) => target === 'configGroup' ? r.key === rawId : r.id === Number(childId ?? rawId));
            if (!row) return failure(404, 100002);
            if (target === 'user' && !data.nickname && action !== 'assignMenus') return failure(400, 100001);
            if (['user', 'role', 'menu'].includes(target)) {
                if (data.version !== row.version && !fault.staleUpdateAccepted) return failure(409, 100007);
            }
            if (type === 'menu') {
                let parent = db.menu.find((r) => r.id === data.parentId);
                while (parent) { if (parent.id === row.id) return failure(409, 100004); parent = db.menu.find((r) => r.id === parent.parentId); }
            }
            if (action === 'assignMenus') { if (!fault.revokeIgnored || data.menuIds.length) row.menuIds = data.menuIds; }
            else Object.assign(row, data);
            if (['user', 'role', 'menu'].includes(target)) row.version++;
            revision++; return success();
        }
        if (action.startsWith('delete')) {
            if (fault.failDelete) throw new Error('synthetic delete unavailable');
            const target = action === 'deleteGroup' ? 'configGroup' : action === 'deleteItem' ? 'dictItem' : type;
            const index = db[target].findIndex((r) => target === 'configGroup' ? r.key === rawId : r.id === Number(childId ?? rawId));
            if (index < 0) return failure(404, 100002);
            const row = db[target][index];
            if (row.isBuiltin || target === 'menu' && db.menu.some((r) => r.parentId === row.id)
                || target === 'role' && db.user.some((r) => r.roleIds.includes(row.id))
                || target === 'configGroup' && db.config.some((r) => r.groupKey === row.key)) return failure(409, 100004);
            db[target].splice(index, 1);
            if (target === 'dict') db.dictItem = db.dictItem.filter((r) => r.dictId !== row.id);
            revision++; return success();
        }
        return failure(404, 100002);
    }
    const fetcher = async (url, options) => { const value = await dispatch(url, options); return Response.json(value.payload, { status: value.status, headers: value.headers }); };
    return { db, calls, fault, dispatch, fetcher };
}
