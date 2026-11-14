import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export function workflowError(code, message) {
    return Object.assign(new Error(message), { code });
}

// 只保护短时文件更新；不在持锁期间执行网络请求。
export function withFileLock(root, name, action, timeoutMs = 3000) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw workflowError('CONFIG', '锁名称无效');
    const directory = path.join(root, '.local/locks');
    let existing = directory;
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    const boundary = fs.realpathSync(root);
    const real = fs.realpathSync(existing);
    if (real !== boundary && !real.startsWith(`${boundary}${path.sep}`)) throw workflowError('CONFIG', '锁目录链接越界');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, `${name}.lock`);
    const owner = { pid: process.pid, host: os.hostname(), token: randomUUID() };
    const deadline = Date.now() + timeoutMs;
    while (true) {
        try {
            const descriptor = fs.openSync(file, 'wx', 0o600);
            try { fs.writeFileSync(descriptor, JSON.stringify(owner)); }
            finally { fs.closeSync(descriptor); }
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            // 不自动抢占遗留锁；无法确认的锁显式失败，避免误删正在使用的锁。
            if (Date.now() >= deadline) throw workflowError('CONFLICT', '文件更新正被占用，稍后重试；损坏的锁需确认无操作后人工处理');
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
        }
    }
    try { return action(); }
    finally {
        try {
            if (JSON.parse(fs.readFileSync(file, 'utf8')).token === owner.token) fs.unlinkSync(file);
        } catch { /* 不删除其他操作的锁。 */ }
    }
}
