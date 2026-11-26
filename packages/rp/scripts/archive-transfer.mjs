/** GitHub Release 字节只在内存中校验，再在私有目录解压；不接受网络提供的落盘路径。 */
import { execFileSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export async function restoreArchive(bytes, id, root = '.prototype-archives') {
    if (!/^v[\w.-]+$/.test(id)) throw new Error('归档编号无效');
    const entries = execFileSync('tar', ['-tzf', '-'], { input: bytes, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n');
    if (entries.some(path => !path.startsWith(`${id}/`) || path.split('/').includes('..') || /[\\\r\0]/.test(path))) throw new Error('归档路径无效');
    const details = execFileSync('tar', ['-tvzf', '-'], { input: bytes, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (details.split('\n').some(line => line && !['-', 'd'].includes(line[0]))) throw new Error('归档包含非常规文件');
    await mkdir(root, { recursive: true });
    if ((await lstat(root)).isSymbolicLink()) throw new Error('归档目录不能是符号链接');
    if ((await readdir(root)).includes(id)) throw new Error(`拒绝覆盖已有快照：${id}`);
    const temp = await mkdtemp(join(tmpdir(), 'prototype-archive-'));
    try {
        execFileSync('tar', ['-xzf', '-', '--no-same-owner', '--no-same-permissions', '-C', temp], { input: bytes });
        await cp(join(temp, id), join(root, id), { recursive: true, force: false, errorOnExist: true });
    } finally { await rm(temp, { recursive: true, force: true }); }
}
