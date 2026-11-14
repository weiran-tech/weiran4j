import { ok, error, requireValue, page, tree, array } from '../../api/protocol.mjs';
import { permissions } from '../../api/session.mjs';

import { userBody, roleBody, menuBody } from '../../api/data.mjs';
const p = '/api-backend/system/';
export async function userLifecycle(api: any, resources: any) {
    permissions(api, ['system:user:list', 'system:user:create', 'system:user:update', 'system:user:delete']);
    const key = resources.key('u'), body = userBody(key);
    let uid: string;
    try {
        uid = await resources.create('user', key, body);
        error(await api.request(p + 'user/create', 'POST', body), 409, 100003);
    } finally { body.password = ''; }
    const rows = page(ok(await api.request(p + `user/list?keyword=${key}&page=1&pageSize=2`)));
    requireValue(rows.some((row: any) => String(row.id) === uid && row.username === key), '新用户检索不一致');
    const before = ok(await api.request(p + `user/get/${uid}`));
    const update = { version: before.version, nickname: 'Updated API user', gender: 'unknown', status: 'enabled', roleIds: [] };
    error(await api.request(p + `user/update/${uid}`, 'PUT', { ...update, nickname: '' }), 400, 100001);
    ok(await api.request(p + `user/update/${uid}`, 'PUT', update));
    const after = ok(await api.request(p + `user/get/${uid}`));
    requireValue(after.nickname === update.nickname && after.version > before.version, '用户更新未生效');
    error(await api.request(p + `user/update/${uid}`, 'PUT', { ...update, nickname: 'stale' }), 409, 100007);
    requireValue(ok(await api.request(p + `user/get/${uid}`)).nickname === update.nickname, '陈旧用户草稿覆盖了新数据');
    await resources.remove(resources.value.resources.find((entry: any) => entry.type === 'user' && entry.id === uid));
    return { createdAndSearched: true, updated: true, duplicateRejected: true, staleDraftRejected: true, deletedAndVerified: true };
}
export async function roleLifecycle(api: any, resources: any) {
    permissions(api, ['system:role:list', 'system:role:create', 'system:role:update', 'system:role:delete', 'system:role:assign-menu', 'system:user:create', 'system:user:delete', 'system:user:list']);
    const key = resources.key('r'), body = roleBody(key), rid = await resources.create('role', key, body);
    error(await api.request(p + 'role/create', 'POST', body), 409, 100003);
    let row = ok(await api.request(p + `role/get/${rid}`));
    const originalVersion = row.version;
    ok(await api.request(p + `role/update/${rid}`, 'PUT', { ...body, name: 'Updated role', version: row.version }));
    row = ok(await api.request(p + `role/get/${rid}`));
    requireValue(row.name === 'Updated role' && row.version > originalVersion, '角色资料更新未生效');
    error(await api.request(p + `role/update/${rid}`, 'PUT', { ...body, version: originalVersion }), 409, 100007);
    error(await api.request(p + `role/assignMenus/${rid}`, 'PUT', { version: originalVersion, menuIds: [] }), 409, 100007);
    ok(await api.request(p + `role/assignMenus/${rid}`, 'PUT', { version: row.version, menuIds: [] }));
    const assigned = ok(await api.request(p + `role/get/${rid}`));
    requireValue(assigned.version > row.version && assigned.name === 'Updated role' && array(assigned.menuIds).length === 0, '角色授权版本或资料保持不正确');
    error(await api.request(p + `role/update/${rid}`, 'PUT', { ...body, version: row.version }), 409, 100007);
    const user = userBody(resources.key('u'), [rid]);
    try { await resources.create('user', user.username, user); } finally { user.password = ''; }
    error(await api.request(p + `role/delete/${rid}`, 'DELETE'), 409, 100004);
    requireValue(ok(await api.request(p + `role/get/${rid}`)).name === 'Updated role', '有用户的角色被错误删除');
    return { lifecycleVerified: true, sharedVersionVerified: true, staleProfileAndGrantRejected: true, assignedRoleDeleteRejected: true };
}
export async function menuLifecycle(api: any, resources: any) {
    permissions(api, ['system:menu:list', 'system:menu:create', 'system:menu:update', 'system:menu:delete']);
    const rootKey = '/' + resources.key('m0'), root = await resources.create('menu', rootKey, menuBody(rootKey), '0');
    const childKey = '/' + resources.key('m1'), child = await resources.create('menu', childKey, menuBody(childKey, root), root);
    const original = ok(await api.request(p + `menu/get/${root}`));
    const updated = { ...menuBody(rootKey), title: 'Updated API directory', version: original.version };
    ok(await api.request(p + `menu/update/${root}`, 'PUT', updated));
    const current = ok(await api.request(p + `menu/get/${root}`));
    requireValue(current.title === updated.title && current.version > original.version, '菜单更新未生效');
    error(await api.request(p + `menu/update/${root}`, 'PUT', updated), 409, 100007);
    error(await api.request(p + `menu/update/${root}`, 'PUT', { ...updated, version: current.version, parentId: Number(child) }), 409, 100004);
    error(await api.request(p + `menu/delete/${root}`, 'DELETE'), 409, 100004);
    const nodes = tree(ok(await api.request(p + 'menu/list')));
    requireValue(nodes.some((node: any) => String(node.id) === child && String(node.parentId) === root), '菜单树父子关系未保持');
    return { disabledDirectoriesOnly: true, updated: true, staleDraftRejected: true, cycleRejected: true, nonLeafDeleteRejected: true };
}
