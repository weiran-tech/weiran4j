import { ok, error, requireValue, tree, id, array } from '../../api/protocol.mjs';
import { permissions, withIdentity } from '../../api/session.mjs';
import { userBody, roleBody } from '../../api/data.mjs';

export async function permissionBoundary(api: any, resources: any) {
    permissions(api, ['system:user:create', 'system:user:list', 'system:user:delete', 'system:role:create', 'system:role:list', 'system:role:delete', 'system:role:assign-menu', 'system:menu:list']);
    const candidates = tree(ok(await api.request('/api-backend/system/menu/list'))).filter((row: any) => row.permission === 'system:user:list' && row.status === 'enabled');
    requireValue(candidates.length === 1, '测试环境缺少唯一的已有用户读取权限定义');
    const menuId = id(candidates[0].id), role = resources.key('r');
    const rid = await resources.create('role', role, roleBody(role));
    let detail = ok(await api.request(`/api-backend/system/role/get/${rid}`));
    ok(await api.request(`/api-backend/system/role/assignMenus/${rid}`, 'PUT', { version: detail.version, menuIds: [Number(menuId)] }));
    const user = userBody(resources.key('u'), [rid]);
    let uid: string;
    const subjectCredentials = { username: user.username, password: user.password };
    try { uid = await resources.create('user', user.username, user); } finally { user.password = ''; }
    try {
        await withIdentity({ ...api.scope, role: 'api-subject' }, subjectCredentials, async (subject: any) => {
            requireValue(id(subject.identity.id) === uid && !subject.identity.permissions.includes('*'), '临时主体隔离或普通权限前提无效');
            const before = ok(await subject.request('/api-backend/system/auth/getAuthorizationSnapshot'));
            requireValue(id(before.user?.id) === uid && before.user.username === subjectCredentials.username && array(before.user.permissions).includes('system:user:list') && typeof before.revision === 'string', '授权前快照不一致');
            ok(await subject.request('/api-backend/system/user/list?page=1&pageSize=2'));
            error(await subject.request('/api-backend/system/role/list'), 403, 100102);
            detail = ok(await api.request(`/api-backend/system/role/get/${rid}`));
            ok(await api.request(`/api-backend/system/role/assignMenus/${rid}`, 'PUT', { version: detail.version, menuIds: [] }));
            error(await subject.request('/api-backend/system/user/list'), 403, 100102);
            const after = ok(await subject.request('/api-backend/system/auth/getAuthorizationSnapshot'));
            requireValue(id(after.user?.id) === uid && after.user.username === subjectCredentials.username && !array(after.user.permissions).includes('system:user:list')
                && typeof after.revision === 'string' && after.revision !== before.revision, '撤权后授权快照未校准');
        });
    } finally { subjectCredentials.password = ''; }
    return { subjectIsolated: true, allowedVerified: true, forbiddenVerified: true, sameSessionRevocationVerified: true, revisionChanged: true };
}
