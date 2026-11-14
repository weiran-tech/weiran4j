import { randomBytes } from 'node:crypto';
export const password = () => `Api!${randomBytes(18).toString('base64url')}9aA`;
export function userBody(username, roleIds = []) {
    return { username, nickname: username, password: password(), status: 'enabled', gender: 'unknown', roleIds: roleIds.map(Number) };
}
export const roleBody = (code) => ({ name: code, code, status: 'enabled', sort: 0, description: 'isolated API workflow' });
export const menuBody = (key, parentId = '0') => ({ title: key.slice(1), path: key, parentId: Number(parentId), type: 'directory',
    visible: false, status: 'disabled', sort: 0, keepAlive: false, isExternal: false });
