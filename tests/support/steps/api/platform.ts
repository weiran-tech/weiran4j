import { ok, error, requireValue, array, page } from '../../api/protocol.mjs';
import { permissions } from '../../api/session.mjs';
const p = '/api-backend/system/';
export async function dictLifecycle(api: any, resources: any) {
    permissions(api, ['system:dict:list', 'system:dict:create', 'system:dict:update', 'system:dict:delete']);
    const key = resources.key('d'), body = { name: key, code: key, status: 'enabled' };
    const did = await resources.create('dict', key, body);
    error(await api.request(p + 'dict/create', 'POST', body), 409, 100003);
    const first = { label: 'First', value: resources.key('i1'), sort: 1, status: 'enabled' };
    const second = { label: 'Second', value: resources.key('i2'), sort: 2, status: 'enabled' };
    const firstId = await resources.create('dictItem', first.value, first, did);
    await resources.create('dictItem', second.value, second, did);
    error(await api.request(p + `dict/createItem/${did}`, 'POST', first), 409, 100003);
    let items = array(ok(await api.request(p + `dict/listItems/${did}`)));
    requireValue(items.length === 2 && items[0].value === second.value && items[1].value === first.value, '管理字典项按ID倒序不一致');
    const enabledBefore = array(ok(await api.request(p + `dict/listItemsByCode/${key}`)));
    requireValue(enabledBefore.length === 2 && enabledBefore[0].value === first.value && enabledBefore[1].value === second.value, '启用字典项按sort排序无效');
    ok(await api.request(p + `dict/updateItem/${did}/${firstId}`, 'PUT', { ...first, status: 'disabled', label: 'Updated first' }));
    items = array(ok(await api.request(p + `dict/listItemsByCode/${key}`)));
    requireValue(items.length === 1 && items[0].value === second.value, '启用字典项过滤无效');
    requireValue(array(ok(await api.request(p + `dict/listItems/${did}`))).some((row: any) => row.value === first.value && row.label === 'Updated first' && row.status === 'disabled'), '字典项更新未生效');
    ok(await api.request(p + `dict/update/${did}`, 'PUT', { ...body, name: 'Updated API dictionary' }));
    requireValue(ok(await api.request(p + `dict/get/${did}`)).name === 'Updated API dictionary', '字典更新未生效');
    requireValue(page(ok(await api.request(p + `dict/list?keyword=${key}&page=1&pageSize=2`))).some((row: any) => String(row.id) === did), '新字典检索不一致');
    await resources.cascadeDictionary(did);
    return { lifecycleVerified: true, duplicatesRejected: true, sortingVerified: true, enabledFilterVerified: true, cascadeVerified: true };
}
export async function configLifecycle(api: any, resources: any) {
    permissions(api, ['system:config:list', 'system:config:create', 'system:config:update', 'system:config:delete']);
    const group = resources.key('g'), groupBody = { key: group, label: group, groupKey: 'config_system' };
    await resources.create('configGroup', group, groupBody);
    error(await api.request(p + 'config/createGroup', 'POST', groupBody), 409, 100003);
    ok(await api.request(p + `config/updateGroup/${group}`, 'PUT', { label: 'Updated API group' }));
    requireValue(array(ok(await api.request(p + 'config/listGroups'))).some((row: any) => row.key === group && row.groupKey === 'config_system' && row.label === 'Updated API group'), '配置分组更新未生效');
    const key = `system.${group}.value`, body = { configKey: key, configValue: 'isolated test value', configType: 'string', groupKey: group, fieldType: 'text', required: false };
    const cid = await resources.create('config', key, body, group);
    error(await api.request(p + 'config/create', 'POST', body), 409, 100003);
    error(await api.request(p + `config/deleteGroup/${group}`, 'DELETE'), 409, 100004);
    error(await api.anonymous(`/api-backend/n/system/config/getPublic/${key}`), 403, 100102);
    const publicTitle = ok(await api.anonymous('/api-backend/n/system/config/getPublic/system.general.title'));
    requireValue(publicTitle?.configKey === 'system.general.title' && typeof publicTitle.configValue === 'string', '白名单公开配置契约无效');
    ok(await api.request(p + `config/update/${cid}`, 'PUT', { ...body, configValue: 'updated isolated value' }));
    const row = ok(await api.request(p + `config/get/${cid}`));
    requireValue(row.configKey === key && row.groupKey === group && row.configValue === 'updated isolated value', '配置更新未生效');
    requireValue(page(ok(await api.request(p + `config/list?keyword=${key}&page=1&pageSize=2`))).some((item: any) => String(item.id) === cid), '新配置检索不一致');
    return { lifecycleVerified: true, duplicateRejected: true, nonEmptyGroupProtected: true, privatePublicBoundaryVerified: true, whitelistReadOnly: true };
}
