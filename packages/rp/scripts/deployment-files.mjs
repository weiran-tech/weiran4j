/** 仅允许发布 dist 内的静态资源，不跟随链接，不上传配置、源码或凭据。 */
import { constants } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
const extensions = new Set(['.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.txt', '.pdf', '.xlsx', '.zip']);
export async function collectDeploymentFiles(directory, prefix = '') {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = prefix + entry.name;
        if (entry.isSymbolicLink()) throw new Error(`拒绝发布符号链接：${file}`);
        if (entry.name.startsWith('.')) throw new Error(`拒绝发布隐藏文件：${file}`);
        const path = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await collectDeploymentFiles(path, `${file}/`));
        else if (file !== 'serve.mjs') {
            if (!entry.isFile() || !extensions.has(extname(entry.name).toLowerCase())) throw new Error(`不是允许发布的静态资源：${file}`);
            // 同一描述符检查并读取，O_NOFOLLOW 拒绝检查后换成的符号链接。
            const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
            try {
                if (!(await handle.stat()).isFile()) throw new Error(`不是普通文件：${file}`);
                files.push({ file, content: await handle.readFile() });
            } finally { await handle.close(); }
        }
    }
    return files;
}
export function deploymentHost(value) {
    if (typeof value !== 'string' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(value)) throw new Error('托管平台返回无效部署地址');
    return value;
}
export function deploymentId(value) {
    if (typeof value !== 'string' || !/^dpl_[A-Za-z0-9]+$/.test(value)) throw new Error('托管平台返回无效部署编号');
    return value;
}
