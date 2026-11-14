import { ok, error, requireValue, page, array, tree, id } from '../../api/protocol.mjs';
import { permissions } from '../../api/session.mjs';

const prefix = '/api-backend/system/';
function record(type: string, row: any) {
    id(row?.id);
    const strings: Record<string, string[]> = { user: ['username', 'nickname', 'status'], role: ['name', 'code', 'status'],
        dict: ['name', 'code', 'status'], config: ['configKey', 'configValue', 'configType', 'groupKey'],
        loginLog: ['username', 'eventType', 'status'], operationLog: ['module', 'method', 'path'] };
    requireValue(strings[type].every((key) => typeof row[key] === 'string'), '业务记录字段形状无效');
    if (['user', 'role'].includes(type)) requireValue(Number.isInteger(row.version) && row.version >= 0, '业务记录版本无效');
    if (['user', 'role', 'dict', 'config'].includes(type)) requireValue(typeof row.isBuiltin === 'boolean', '业务记录内置标记无效');
    if (type === 'user') requireValue(!['password', 'passwordHash', 'token'].some((key) => key in row), '用户读取暴露了认证材料字段');
    if (type === 'operationLog') requireValue(typeof row.responseCode === 'number' && typeof row.success === 'boolean' && typeof row.durationMs === 'number', '操作日志结果字段无效');
}
export async function readCore(api: any) {
    permissions(api, ['system:user:list', 'system:role:list', 'system:menu:list', 'system:dict:list', 'system:config:list', 'system:login-log:list', 'system:operation-log:list']);
    let detailChecks = 0;
    for (const type of ['user', 'role', 'dict', 'config', 'loginLog', 'operationLog']) {
        const rows = page(ok(await api.request(`${prefix}${type}/list?page=1&pageSize=2`)));
        rows.forEach((row: any) => record(type, row));
        if (rows.length && type !== 'loginLog') {
            const row = ok(await api.request(`${prefix}${type}/get/${id(rows[0].id)}`));
            record(type, row);
            requireValue(id(row?.id) === id(rows[0].id), '列表与详情身份不一致');
            if (type === 'user') requireValue(typeof row.username === 'string' && typeof row.version === 'number' && !('password' in row), '用户详情契约无效');
            if (type === 'role') requireValue(typeof row.code === 'string' && Array.isArray(row.menuIds), '角色详情契约无效');
            if (type === 'dict') array(ok(await api.request(`${prefix}dict/listItems/${id(row.id)}`)));
            detailChecks++;
        }
    }
    const menus = tree(ok(await api.request(prefix + 'menu/list')));
    menus.forEach((row: any) => requireValue(typeof row.title === 'string' && ['directory', 'menu', 'button'].includes(row.type) && Number.isInteger(row.version), '菜单节点字段无效'));
    if (menus.length) requireValue(id(ok(await api.request(prefix + `menu/get/${id(menus[0].id)}`)).id) === id(menus[0].id), '菜单详情契约无效');
    array(ok(await api.request(prefix + 'user/listOptions')));
    array(ok(await api.request(prefix + 'role/listOptions')));
    array(ok(await api.request(prefix + 'config/listAll')));
    array(ok(await api.request(prefix + 'config/listGroups')));
    // PageQuery clamps numeric boundaries; conversion failures still return 400.
    page(ok(await api.request(prefix + 'user/list?page=0&pageSize=999')), 1, 200);
    page(ok(await api.request(prefix + 'user/list?page=-1&pageSize=0')), 1, 20);
    error(await api.request(prefix + 'user/list?page=not-a-number'), 400, 100001);
    return { pagedResources: 6, menuTreeVerified: true, detailChecks, emptyResultsAccepted: true, paginationBoundsVerified: true };
}
export function regionTree(value: any, parentCode: string | null = null, seen = new Set<string>()): any[] {
    const flat: any[] = [];
    for (const row of array(value)) {
        id(row.id);
        requireValue(typeof row.code === 'string' && /^\d{6}$/.test(row.code) && !seen.has(row.code)
            && typeof row.name === 'string' && row.parentCode === parentCode && ['province', 'city', 'district'].includes(row.level)
            && ['enabled', 'disabled'].includes(row.status), '地区树字段或父子关系无效');
        seen.add(row.code); flat.push(row);
        if (row.children !== undefined && row.children !== null) flat.push(...regionTree(row.children, row.code, seen));
    }
    return flat;
}
export async function readRegions(api: any) {
    permissions(api, ['region:list']);
    const publicNodes = regionTree(ok(await api.anonymous('/api-backend/n/region/area/getEnabledTree')));
    requireValue(publicNodes.every((row) => row.status === 'enabled'), '公开地区树包含禁用地区');
    error(await api.anonymous('/api-backend/region/area/listTree'), 401, 100101);
    regionTree(ok(await api.request('/api-backend/region/area/listTree')));
    const rows = array(ok(await api.request('/api-backend/region/area/list')));
    rows.forEach((row: any) => { id(row.id); requireValue(typeof row.code === 'string' && typeof row.name === 'string', '地区列表字段无效'); });
    const lookup = regionTree(ok(await api.request('/api-backend/region/area/getEnabledTree')));
    requireValue(lookup.every((row) => row.status === 'enabled'), '登录地区树包含禁用地区');
    if (rows.length) {
        const detail = ok(await api.request(`/api-backend/region/area/get/${id(rows[0].id)}`));
        requireValue(id(detail.id) === id(rows[0].id) && detail.code === rows[0].code, '地区列表与详情不一致');
    }
    return { publicTreeVerified: true, managementAuthVerified: true, listIsArray: true, lookupVerified: true, detailChecked: rows.length > 0 };
}
