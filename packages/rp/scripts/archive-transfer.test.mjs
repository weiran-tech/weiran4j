import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { restoreArchive } from './archive-transfer.mjs';
function archive(name, type = '0') {
    const header = Buffer.alloc(512);
    header.write(name, 0, 100); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116); header.write('00000000000\0', 124); header.write('00000000000\0', 136); header.fill(32, 148, 156); header.write(type, 156);
    if (type === '2') header.write('/etc/hosts', 157);
    header.write('ustar\0', 257); header.write('00', 263);
    header.write(header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148);
    return gzipSync(Buffer.concat([header, Buffer.alloc(1024)]));
}
test('合法归档可恢复，已有快照永不覆盖', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'archive-test-'));
    try {
        await restoreArchive(archive('v1.0/index.html'), 'v1.0', dir);
        assert.equal((await readFile(join(dir, 'v1.0/index.html'))).length, 0);
        await assert.rejects(restoreArchive(archive('v1.0/index.html'), 'v1.0', dir), /拒绝覆盖/);
    } finally { await rm(dir, { recursive: true, force: true }); }
});
test('拒绝跨目录、其他版本目录、符号链接及已有归档根链接', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'archive-test-'));
    try {
        for (const name of ['v1.0/../escape', 'v2.0/index.html', '/tmp/leak', 'v1.0/dir\\file']) await assert.rejects(restoreArchive(archive(name), 'v1.0', dir), /归档路径无效/);
        await assert.rejects(restoreArchive(archive('v1.0/link', '2'), 'v1.0', dir), /非常规文件/);
        await symlink(dir, join(dir, 'linked'));
        await assert.rejects(restoreArchive(archive('v1.0/index.html'), 'v1.0', join(dir, 'linked')), /符号链接/);
    } finally { await rm(dir, { recursive: true, force: true }); }
});
