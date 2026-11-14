import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { workflowError } from './utils.mjs';

const AUTH = '/api-backend/system/auth/';
const TOKEN = 'weiran_token', CSRF = 'weiran_csrf';
const ensure = (value, message, code = 'CONFIG') => { if (!value) throw workflowError(code, message); };

export function readCredentials(root, role = 'admin') {
    ensure(/^[a-z][a-z0-9-]*$/.test(role), '角色名称无效');
    let config = {};
    const file = (role === 'admin' ? process.env.FLOW_ADMIN_PASSWORD_FILE : undefined) ?? path.join(root, '.local', `${role}.json`);
    try { config = readPrivate(file); } catch { /* 显式环境变量可独立提供凭据。 */ }
    const username = (role === 'admin' ? process.env.FLOW_ADMIN_USERNAME : undefined) ?? config.username ?? role;
    const password = (role === 'admin' ? process.env.FLOW_ADMIN_PASSWORD : undefined) ?? config.password;
    ensure(typeof username === 'string' && username.length > 0 && typeof password === 'string' && password.length > 0, '测试账号密码未配置，凭据文件须为 0600');
    return { username, password };
}

function inside(root, target) {
    let existing = target;
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    const boundary = fs.realpathSync(root), real = fs.realpathSync(existing);
    ensure(real === boundary || real.startsWith(`${boundary}${path.sep}`), '登录态路径链接越界');
    return target;
}
function scope(root, environment, role, addresses) {
    ensure(/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(environment) && /^[a-z][a-z0-9-]*$/.test(role), '环境或角色无效');
    const urls = [addresses.apiBaseURL, addresses.webBaseURL].map((value) => {
        const url = new URL(value);
        ensure(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash, '会话服务地址无效');
        return url;
    });
    ensure(urls[0].hostname === urls[1].hostname, 'Cookie 会话要求 API 与后台使用同一 hostname');
    const directory = path.join(root, '.local/sessions', environment);
    return { file: inside(root, path.join(directory, `${role}.json`)), recovery: inside(root, path.join(directory, `${role}.recovery`)) };
}
function readPrivate(file) {
    try {
        ensure((fs.statSync(file).mode & 0o077) === 0, '私有文件权限必须为 0600');
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { throw workflowError('CONFIG', '本地会话恢复材料缺失、权限过宽或损坏'); }
}
function writePrivate(file, value, exclusive = false) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = exclusive ? file : `${file}.tmp-${process.pid}`;
    try {
        fs.writeFileSync(temporary, JSON.stringify(value) + '\n', { flag: 'wx', mode: 0o600 });
        if (!exclusive) fs.renameSync(temporary, file);
    } finally { if (!exclusive && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
const tokenOf = (principal) => principal.storageState.cookies.find((cookie) => cookie.name === TOKEN)?.value;
const journalName = (principal) => createHash('sha256').update(tokenOf(principal)).digest('hex').slice(0, 32) + '.json';

/** Only authentication cookies are persisted; application localStorage is never copied. */
export function principalFromState(storageState, addresses, allowExpired = false) {
    scopeAddresses(addresses);
    const hostname = new URL(addresses.apiBaseURL).hostname;
    const cookies = [TOKEN, CSRF].map((name) => {
        const found = storageState?.cookies?.filter((item) => item.name === name);
        ensure(found?.length === 1, '登录态缺少唯一的认证 Cookie');
        const cookie = found[0];
        ensure(typeof cookie.value === 'string' && cookie.value && !/[\s;,\r\n]/.test(cookie.value), '认证 Cookie 无效');
        ensure(cookie.domain === hostname && cookie.path === (name === TOKEN ? '/api-backend' : '/')
            && cookie.httpOnly === (name === TOKEN) && typeof cookie.secure === 'boolean'
            && cookie.sameSite === 'Strict' && Number.isFinite(cookie.expires)
            && (cookie.expires === -1 || cookie.expires > 0), '认证 Cookie 属性或地址无效');
        ensure(allowExpired || cookie.expires === -1 || cookie.expires * 1000 > Date.now(), '认证 Cookie 已过期');
        ensure(!cookie.secure || new URL(addresses.apiBaseURL).protocol === 'https:', 'Secure Cookie 不能用于 HTTP');
        ensure(!cookie.secure || new URL(addresses.webBaseURL).protocol === 'https:', 'Secure Cookie 不能用于 HTTP');
        return { name, value: cookie.value, domain: cookie.domain, path: cookie.path, expires: cookie.expires,
            httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite };
    });
    const id = cookies[1].value.split('.')[0];
    ensure(/^[1-9]\d*$/.test(id), 'CSRF Cookie 主体无效');
    return { id, storageState: { cookies, origins: [] } };
}
function scopeAddresses(addresses) {
    for (const value of [addresses.apiBaseURL, addresses.webBaseURL]) {
        const url = new URL(value);
        ensure(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash, '会话服务地址无效');
    }
    ensure(new URL(addresses.apiBaseURL).hostname === new URL(addresses.webBaseURL).hostname, 'Cookie 会话要求 API 与后台使用同一 hostname');
}
function applyCookies(principal, response, baseURL) {
    const hostname = new URL(baseURL).hostname;
    for (const value of response.headers.getSetCookie()) {
        const [pair, ...attributes] = value.split(';').map((part) => part.trim());
        const index = pair.indexOf('='), name = pair.slice(0, index);
        if (![TOKEN, CSRF].includes(name)) continue;
        const attrs = Object.fromEntries(attributes.map((part) => {
            const index = part.indexOf('=');
            return [part.slice(0, index < 0 ? undefined : index).toLowerCase(), index < 0 ? true : part.slice(index + 1)];
        }));
        ensure(!attrs.domain || attrs.domain === hostname, '响应认证 Cookie 地址不匹配', 'ENVIRONMENT');
        const cookies = principal.storageState.cookies;
        principal.storageState.cookies = cookies.filter((cookie) => cookie.name !== name);
        const cookieValue = pair.slice(index + 1);
        if (!cookieValue || (attrs['max-age'] !== undefined && Number(attrs['max-age']) <= 0)) continue;
        const expires = attrs['max-age'] !== undefined ? Date.now() / 1000 + Number(attrs['max-age']) : attrs.expires ? Date.parse(attrs.expires) / 1000 : -1;
        principal.storageState.cookies.push({ name, value: cookieValue, domain: hostname, path: attrs.path ?? '/', expires,
            httpOnly: attrs.httponly === true, secure: attrs.secure === true, sameSite: attrs.samesite === 'Strict' ? 'Strict' : String(attrs.samesite ?? '') });
    }
}

/**
 * Isolated cookie request; no raw request logging.
 * @param {string} apiBaseURL
 * @param {string} route
 * @param {{principal?: any, method?: string, data?: unknown, csrf?: boolean}} [options]
 */
export async function sessionRequest(apiBaseURL, route, { principal, method = 'GET', data, csrf = true } = {}) {
    const url = new URL(`${apiBaseURL}${route}`);
    const cookies = (principal?.storageState.cookies ?? []).filter((cookie) => cookie.domain === url.hostname
        && (url.pathname === cookie.path || url.pathname.startsWith(cookie.path.endsWith('/') ? cookie.path : `${cookie.path}/`))
        && (!cookie.secure || url.protocol === 'https:') && (cookie.expires === -1 || cookie.expires * 1000 > Date.now()));
    const csrfValue = cookies.find((cookie) => cookie.name === CSRF)?.value;
    let response;
    try {
        response = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(10000),
            headers: { 'Content-Type': 'application/json', ...(cookies.length ? { Cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ') } : {}),
                ...(csrf && csrfValue && !['GET', 'HEAD', 'OPTIONS'].includes(method) ? { 'X-CSRF-Token': csrfValue } : {}) },
            body: data === undefined ? undefined : JSON.stringify(data) });
    } catch { throw workflowError('ENVIRONMENT', '会话请求连接失败或超时'); }
    if (principal) applyCookies(principal, response, apiBaseURL);
    let payload;
    try { payload = await response.json(); } catch { throw workflowError('ENVIRONMENT', '会话响应不是有效 JSON'); }
    return { status: response.status, payload };
}
function envelope(environment, role, addresses, username, principal) {
    const normalized = principalFromState(principal.storageState, addresses, true);
    const expiries = normalized.storageState.cookies.map((cookie) => cookie.expires).filter((value) => value > 0);
    return { version: 2, environment, role, username, principalId: normalized.id, ...addresses, state: 'cleanup-required',
        expiresAt: new Date(Math.min(Date.now() + 10 * 60 * 1000, ...expiries.map((value) => value * 1000))).toISOString(), storageState: normalized.storageState };
}
function decode(session, environment, role, addresses, allowExpired = false) {
    ensure(session.version === 2 && session.environment === environment && session.role === role
        && session.apiBaseURL === addresses.apiBaseURL && session.webBaseURL === addresses.webBaseURL, '登录态与环境、角色或地址不匹配');
    ensure(allowExpired || session.state === 'active', '登录态未通过核验，只能清理或恢复');
    ensure(allowExpired || Date.parse(session.expiresAt) > Date.now(), '本地登录态已过期，请先 session clear 再 login');
    const principal = principalFromState(session.storageState, addresses, allowExpired);
    ensure(principal.id === session.principalId && typeof session.username === 'string' && session.username, '本地认证主体无效');
    return { session, principal };
}
export function loadSession(root, environment, role, addresses, allowExpired = false) {
    const location = scope(root, environment, role, addresses);
    ensure(fs.existsSync(location.file), '本地登录态缺失，请先 session login');
    return { ...decode(readPrivate(location.file), environment, role, addresses, allowExpired), file: location.file };
}
async function verifyIdentity(value, addresses) {
    const result = await sessionRequest(addresses.apiBaseURL, `${AUTH}getCurrentUser`, { principal: value.principal });
    ensure(result.status === 200 && result.payload?.code === 0 && result.payload.data?.username === value.session.username
        && String(result.payload.data?.id) === value.session.principalId, '登录态已失效或身份不一致，请清理后重新登录', 'ENVIRONMENT');
}
export async function checkSession(root, environment, role, addresses) {
    const value = loadSession(root, environment, role, addresses);
    await verifyIdentity(value, addresses);
    return value;
}
export function rememberSession(root, environment, role, addresses, username, principal) {
    const location = scope(root, environment, role, addresses), session = envelope(environment, role, addresses, username, principal);
    const file = inside(root, path.join(location.recovery, journalName(principal)));
    if (!fs.existsSync(file)) writePrivate(file, session, true);
    else ensure(tokenOf(decode(readPrivate(file), environment, role, addresses, true).principal) === tokenOf(principal), '恢复记录不一致');
    return file;
}
export async function closeSession(apiBaseURL, principal) {
    const logout = await sessionRequest(apiBaseURL, `${AUTH}logout`, { principal, method: 'POST' });
    ensure((logout.status === 200 && logout.payload?.code === 0) || (logout.status === 401 && logout.payload?.code === 100101), '测试会话退出失败', 'CLEANUP');
    if (logout.status === 401) principal.storageState.cookies = [];
    ensure(!principal.storageState.cookies.some((cookie) => [TOKEN, CSRF].includes(cookie.name)), '登出未清除认证 Cookie', 'CLEANUP');
    const anonymous = await sessionRequest(apiBaseURL, `${AUTH}getCurrentUser`, { principal });
    ensure(anonymous.status === 401 && anonymous.payload?.code === 100101, '清理后匿名访问未被拒绝', 'CLEANUP');
}
export async function closeTrackedSession(root, environment, role, addresses, principal) {
    const location = scope(root, environment, role, addresses);
    const token = tokenOf(principal), recovery = inside(root, path.join(location.recovery, journalName(principal)));
    // Do not mutate recovery material before cleanup has succeeded.
    const working = structuredClone(principal);
    try { await closeSession(addresses.apiBaseURL, working); }
    catch { throw workflowError('CLEANUP', '测试会话清理未完成，保留恢复材料；服务恢复后运行 session recover'); }
    if (fs.existsSync(location.file)) {
        let value;
        try { value = loadSession(root, environment, role, addresses, true); } catch { /* Do not delete an unrelated or damaged cache. */ }
        if (value && tokenOf(value.principal) === token) fs.unlinkSync(location.file);
    }
    if (fs.existsSync(recovery)) fs.unlinkSync(recovery);
    principal.storageState.cookies = [];
}
export async function recoverSessions(root, environment, role, addresses) {
    const location = scope(root, environment, role, addresses);
    let recovered = 0;
    for (const name of fs.existsSync(location.recovery) ? fs.readdirSync(location.recovery) : []) {
        ensure(/^[a-f0-9]{32}\.json$/.test(name), '恢复目录包含未知文件，请人工检查');
        const value = decode(readPrivate(inside(root, path.join(location.recovery, name))), environment, role, addresses, true);
        await closeTrackedSession(root, environment, role, addresses, value.principal);
        recovered++;
    }
    return { recovered };
}
export async function clearSession(root, environment, role, addresses) {
    const location = scope(root, environment, role, addresses);
    if (!fs.existsSync(location.file)) return;
    const value = loadSession(root, environment, role, addresses, true);
    await closeTrackedSession(root, environment, role, addresses, value.principal);
}
export async function storeSession(root, environment, role, addresses, username, principal) {
    const location = scope(root, environment, role, addresses);
    rememberSession(root, environment, role, addresses, username, principal);
    ensure(!fs.existsSync(location.file), '登录态文件已存在，请先 session clear', 'CONFLICT');
    const session = envelope(environment, role, addresses, username, principal);
    writePrivate(location.file, session, true);
    await verifyIdentity(loadSession(root, environment, role, addresses, true), addresses);
    session.state = 'active';
    writePrivate(location.file, session);
    return session;
}
export async function saveSession(root, environment, role, addresses) {
    const location = scope(root, environment, role, addresses);
    ensure(!fs.existsSync(location.file), '登录态已存在，请先 session clear，避免遗留旧会话', 'CONFLICT');
    const credentials = readCredentials(root, role), jar = { id: '', storageState: { cookies: [], origins: [] } };
    const username = credentials.username;
    try {
        const result = await sessionRequest(addresses.apiBaseURL, '/api-backend/n/system/auth/login', { principal: jar, method: 'POST', data: credentials });
        ensure(result.status === 200 && result.payload?.code === 0 && result.payload.data?.mfaRequired !== true, '测试账号登录失败或需要二次验证', 'ENVIRONMENT');
        const principal = principalFromState(jar.storageState, addresses);
        rememberSession(root, environment, role, addresses, username, principal);
        await storeSession(root, environment, role, addresses, username, principal);
    } catch (error) {
        if (tokenOf(jar)) {
            try {
                const principal = principalFromState(jar.storageState, addresses, true);
                rememberSession(root, environment, role, addresses, username, principal);
                await closeTrackedSession(root, environment, role, addresses, principal);
            } catch (cleanup) {
                throw Object.assign(workflowError('CLEANUP', '登录核验或清理失败，保留私有恢复材料'), {
                    failures: [{ kind: error.code ?? 'CONFIG', message: error.message }, { kind: cleanup.code ?? 'CLEANUP', message: cleanup.message }],
                });
            }
        }
        throw error;
    } finally { credentials.password = ''; }
}
