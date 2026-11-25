import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
export function archiveDevMiddleware(directory) {
    const root = resolve(directory);
    return (req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname;
        if (!path.startsWith('/releases/')) return next();
        const fail = (code, message) => { res.statusCode = code; res.setHeader('Content-Type', 'text/plain'); res.end(message); };
        const run = async () => {
            res.setHeader('Cache-Control', 'no-cache');
            if (path === '/releases/index.json') {
                const names = await readdir(root).catch((error) => { if (error.code === 'ENOENT') return []; throw error; });
                const index = [];
                for (const name of names) {
                    if (!/^v[\w.-]+$/.test(name)) continue;
                    const meta = JSON.parse(await readFile(resolve(root, name, 'prototype-build.json'), 'utf8'));
                    if (meta.version !== name || meta.base !== `/releases/${name}/`) throw new Error('invalid metadata');
                    index.push(meta);
                }
                res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(index)); return;
            }
            const match = path.match(/^\/releases\/(v[\w.-]+)(?:\/(.*))?$/);
            if (!match) return fail(404, 'Not Found');
            const relative = decodeURIComponent(match[2] || '');
            const base = resolve(root, match[1]);
            let file = resolve(base, relative || 'index.html');
            if (!file.startsWith(base + sep)) return fail(404, 'Not Found');
            let info = await stat(file).catch(() => null);
            if (info?.isDirectory()) { file = resolve(file, 'index.html'); info = await stat(file).catch(() => null); }
            if (!info?.isFile() && !extname(relative)) {
                file = resolve(base, relative === 'mobile' || relative.startsWith('mobile/') ? 'mobile/index.html' : 'index.html');
                info = await stat(file).catch(() => null);
            }
            if (!info?.isFile()) return fail(404, 'Not Found');
            res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
            createReadStream(file).pipe(res);
        };
        void run().catch(() => fail(500, '历史快照不可用，请检查本地归档文件。'));
    };
}
