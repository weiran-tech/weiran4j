import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { allowWrites } from './session.mjs';
import { ok, error, id, array, requireValue, tree } from './protocol.mjs';

const types = new Set(['user', 'role', 'menu', 'dict', 'dictItem', 'config', 'configGroup']);
const field = { user: 'username', role: 'code', menu: 'path', dict: 'code', dictItem: 'value', config: 'configKey', configGroup: 'key' };
const base = (type) => `/api-backend/system/${type}`;
function contained(root, target) {
    let current = target;
    while (!fs.existsSync(current)) current = path.dirname(current);
    const boundary = fs.realpathSync(root), real = fs.realpathSync(current);
    requireValue(real === boundary || real.startsWith(boundary + path.sep), 'API 恢复路径越界');
    return target;
}
export function ledgerPath(root, environment, runId) {
    requireValue(/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(environment) && /^[a-f0-9]{24}$/.test(runId), 'API 恢复环境或 runId 无效');
    return contained(root, path.join(root, '.local/api-resources', environment, runId + '.json'));
}
function write(file, value, exclusive = false) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = exclusive ? file : file + `.tmp-${process.pid}`;
    try {
        fs.writeFileSync(temporary, JSON.stringify(value) + '\n', { flag: 'wx', mode: 0o600 });
        if (!exclusive) fs.renameSync(temporary, file);
    } finally { if (!exclusive && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function validate(value, api, runId) {
    requireValue(value?.version === 1 && value.runId === runId && value.marker === `af_${runId}`
        && value.environment === api.scope.environment && value.apiBaseURL === api.scope.addresses.apiBaseURL
        && value.webBaseURL === api.scope.addresses.webBaseURL && value.actorId === id(api.identity.id)
        && Array.isArray(value.resources), 'API 恢复材料与环境或身份不匹配');
    const seen = new Set();
    for (const entry of value.resources) {
        requireValue(entry && types.has(entry.type) && typeof entry.key === 'string' && !seen.has(entry.type + entry.key), 'API 恢复资源类型或身份无效');
        seen.add(entry.type + entry.key);
        const suffix = `${value.marker}_[a-z0-9]{1,4}`;
        const pattern = entry.type === 'menu' ? `^/${suffix}$` : entry.type === 'config' ? `^system\\.${suffix}\\.value$` : `^${suffix}$`;
        requireValue(new RegExp(pattern).test(entry.key), 'API 恢复资源不属于本次运行');
        requireValue(entry.id === null || typeof entry.id === 'string' && /^[1-9]\d*$/.test(entry.id), 'API 恢复 ID 无效');
        requireValue(['pending', 'created', 'deleted'].includes(entry.state), 'API 恢复状态无效');
        requireValue(entry.parent === null || typeof entry.parent === 'string', 'API 恢复父级无效');
        if (['dictItem', 'config', 'menu'].includes(entry.type)) {
            const parentType = entry.type === 'dictItem' ? 'dict' : entry.type === 'config' ? 'configGroup' : 'menu';
            const parent = value.resources.find((item) => item.type === parentType && (entry.type === 'config' ? item.key === entry.parent : item.id === entry.parent));
            requireValue(entry.type === 'menu' && entry.parent === '0' || !!parent, 'API 恢复父级不属于本次运行');
        } else requireValue(entry.parent === null, 'API 恢复父级不合法');
        if (entry.type === 'user' && entry.id !== null) requireValue(entry.id !== id(api.identity.id), '禁止清理操作者账号');
    }
}
async function rows(api, entry) {
    if (entry.type === 'menu') return tree(ok(await api.request(base('menu') + '/list')));
    if (entry.type === 'dictItem') {
        const response = await api.request(base('dict') + `/listItems/${entry.parent}`);
        if (response.status === 404 && response.payload?.code === 100002) {
            error(await api.request(base('dict') + `/get/${entry.parent}`), 404, 100002);
            return [];
        }
        return array(ok(response));
    }
    if (entry.type === 'configGroup') return array(ok(await api.request(base('config') + '/listGroups'))).filter((row) => row.groupKey === 'config_system');
    const found = [];
    for (let page = 1; ; page++) {
        const result = ok(await api.request(base(entry.type) + `/list?keyword=${encodeURIComponent(entry.key)}&page=${page}&pageSize=200`));
        requireValue(Number.isSafeInteger(result?.total) && result.total >= 0 && result.page === page && result.pageSize === 200, '恢复查询分页无效');
        const list = array(result.list); found.push(...list);
        if (page * 200 >= result.total) return found;
        requireValue(list.length > 0 && page < 1000, '恢复查询无法完整核验');
    }
}
async function find(api, entry) {
    const matching = (await rows(api, entry)).filter((row) => row[field[entry.type]] === entry.key);
    requireValue(matching.length <= 1, 'API 资源唯一身份不确定，停止清理');
    if (!matching.length) return null;
    const row = matching[0];
    if (entry.type !== 'menu' && entry.type !== 'dictItem') requireValue(row.isBuiltin === false, '拒绝清理内置或所有权不明的资源');
    if (entry.type === 'user') requireValue(id(row.id) !== id(api.identity.id), '禁止清理操作者账号');
    if (entry.type === 'menu') requireValue(String(row.parentId) === entry.parent && row.status === 'disabled' && row.type === 'directory', '菜单清理身份或父级不匹配');
    if (entry.type === 'dictItem') requireValue(String(row.dictId) === entry.parent, '字典项清理父级不匹配');
    if (entry.type === 'config') requireValue(row.groupKey === entry.parent, '配置清理分组不匹配');
    if (entry.id && entry.type !== 'configGroup') requireValue(id(row.id) === entry.id, '清理 ID 与唯一身份不匹配');
    return row;
}
function deletion(entry) {
    if (entry.type === 'dictItem') return base('dict') + `/deleteItem/${entry.parent}/${entry.id}`;
    if (entry.type === 'configGroup') return base('config') + `/deleteGroup/${encodeURIComponent(entry.key)}?groupKey=config_system`;
    return base(entry.type) + `/delete/${entry.id}`;
}
function creation(entry) {
    if (entry.type === 'dictItem') return base('dict') + `/createItem/${entry.parent}`;
    if (entry.type === 'configGroup') return base('config') + '/createGroup';
    return base(entry.type) + '/create';
}
export class ResourceLedger {
    /** @param {any} api @param {any} [existing] */
    constructor(api, existing) {
        allowWrites(); this.api = api;
        const runId = existing?.runId ?? randomBytes(12).toString('hex');
        this.file = ledgerPath(api.scope.root, api.scope.environment, runId);
        this.value = existing ?? { version: 1, runId, marker: `af_${runId}`, environment: api.scope.environment,
            ...api.scope.addresses, actorId: id(api.identity.id), resources: [] };
        validate(this.value, api, runId);
        if (!existing) write(this.file, this.value, true);
    }
    key(suffix) { requireValue(/^[a-z0-9]{1,4}$/.test(suffix), '资源后缀无效'); return `${this.value.marker}_${suffix}`; }
    persist() { validate(this.value, this.api, this.value.runId); write(this.file, this.value); }
    /** @param {string} type @param {string} key @param {any} body @param {string|null} [parent] */
    async create(type, key, body, parent = null) {
        allowWrites();
        const entry = { type, key, parent, id: null, state: 'pending' };
        requireValue(types.has(type) && body?.[field[type]] === key, '创建身份与资源清单不一致');
        if (type === 'config') requireValue(body.groupKey === parent, '创建配置父级不一致');
        if (type === 'menu') requireValue(String(body.parentId) === parent && body.type === 'directory' && body.status === 'disabled', '创建菜单必须是本次禁用目录');
        // Validate proposed record before any remote request or persistence.
        validate({ ...this.value, resources: [...this.value.resources, entry] }, this.api, this.value.runId);
        requireValue(await find(this.api, entry) === null, '唯一测试资源已存在，拒绝接管');
        this.value.resources.push(entry); this.persist();
        const response = await this.api.request(creation(entry), 'POST', body);
        // A definite client rejection must not authorize cleanup of a competing row.
        if (response.status >= 400 && response.status < 500) {
            this.value.resources.pop(); this.persist();
        }
        const result = ok(response);
        entry.id = id(result?.id); entry.state = 'created'; this.persist();
        requireValue(await find(this.api, entry) !== null, '创建后未发现本次资源');
        return entry.id;
    }
    async remove(entry) {
        allowWrites(); validate(this.value, this.api, this.value.runId);
        requireValue(this.value.resources.includes(entry), '禁止清理清单外资源');
        if (entry.state === 'deleted') {
            requireValue(await find(this.api, entry) === null, '已清理资源重新出现，停止恢复');
            return;
        }
        const row = await find(this.api, entry);
        if (row) {
            if (entry.type !== 'configGroup') entry.id = id(row.id);
            this.persist();
            ok(await this.api.request(deletion(entry), 'DELETE'));
            if (entry.type !== 'configGroup' && entry.type !== 'dictItem') error(await this.api.request(base(entry.type) + `/get/${entry.id}`), 404, 100002);
            requireValue(await find(this.api, entry) === null, '删除后测试资源仍存在');
        }
        entry.state = 'deleted'; this.persist();
    }
    async cleanup() {
        allowWrites(); validate(this.value, this.api, this.value.runId);
        // Stop on the first unresolved child; do not delete a parent underneath it.
        try { for (const entry of [...this.value.resources].reverse()) await this.remove(entry); }
        catch { throw Object.assign(new Error(`业务资源清理未完成；保留私有清单，使用 test:api:cleanup --run-id ${this.value.runId}`), { resourceRunId: this.value.runId }); }
        fs.unlinkSync(this.file);
    }
    /** Delete a dictionary and verify its children disappeared through the ordinary API. */
    async cascadeDictionary(dictId) {
        allowWrites(); validate(this.value, this.api, this.value.runId);
        const parent = this.value.resources.find((entry) => entry.type === 'dict' && entry.id === String(dictId));
        requireValue(parent && await find(this.api, parent), '级联目标所有权不明');
        ok(await this.api.request(base('dict') + `/delete/${dictId}`, 'DELETE'));
        error(await this.api.request(base('dict') + `/get/${dictId}`), 404, 100002);
        requireValue(await find(this.api, parent) === null, '字典删除未生效');
        // Current API requires an existing parent for item reads.
        const children = await this.api.request(base('dict') + `/listItems/${dictId}`);
        error(children, 404, 100002);
        for (const entry of this.value.resources) if (entry === parent || entry.type === 'dictItem' && entry.parent === String(dictId)) entry.state = 'deleted';
        this.persist();
    }
}
/** @param {any} api @param {string} runId */
export async function recoverResources(api, runId) {
    allowWrites(); const file = ledgerPath(api.scope.root, api.scope.environment, runId);
    if (!fs.existsSync(file)) return { recovered: false };
    requireValue((fs.statSync(file).mode & 0o077) === 0, '恢复清单权限必须为0600');
    let value;
    try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('恢复清单损坏'); }
    validate(value, api, runId);
    await new ResourceLedger(api, value).cleanup();
    return { recovered: true };
}
