/** 双端原型静态服务：管理端（含使用指南）和手机端分别回退到各自入口，历史快照保持隔离。 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = process.env.DIST_ROOT ? resolve(process.env.DIST_ROOT) : resolve(import.meta.dirname);
const PORT = process.env.PORT === undefined ? 5208 : Number(process.env.PORT);
const HOST = '0.0.0.0';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
};

/** 命中则返回文件绝对路径，未命中返回 null */
async function fileAt(pathname) {
    // 防路径穿越：normalize 后必须仍在 ROOT 之内
    const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const abs = resolve(join(ROOT, rel));
    if (abs !== ROOT && !abs.startsWith(ROOT + sep)) return null;
    try {
        const info = await stat(abs);
        if (info.isFile()) return abs;
        if (info.isDirectory()) {
            // 目录请求补 index.html
            const index = join(abs, 'index.html');
            const indexInfo = await stat(index).catch(() => null);
            if (indexInfo?.isFile()) return index;
        }
    } catch {
        /* 不存在 */
    }
    return null;
}

function send(res, abs, status = 200) {
    res.writeHead(status, {
        'Content-Type': MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream',
        // 带 hash 的产物可长缓存；HTML 不缓存，否则改版后用户仍看到旧页面
        'Cache-Control': ['.html', '.json'].includes(extname(abs)) ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    createReadStream(abs).pipe(res);
}

function sendStatus(res, status, message) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(message);
}

const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    try { decodeURIComponent(pathname); } catch { return sendStatus(res, 400, 'Bad Request'); }

    // 1) 静态文件优先（兼容 cleanUrls）
    const direct = await fileAt(pathname);
    if (direct) return send(res, direct);

    if (!pathname.endsWith('/')) {
        const asHtml = await fileAt(`${pathname}.html`);
        if (asHtml) return send(res, asHtml);
    }

    if (pathname === '/versions' || pathname === '/versions/') {
        const index = await fileAt('/index.html');
        return index ? send(res, index) : sendStatus(res, 404, 'Not Found');
    }

    // 独立手机应用与历史版本必须回到各自的入口；不存在的快照返回 404。
    const snapshot = pathname.match(/^\/(releases|versions)\/(v[\w.-]+)(?:\/(.*))?$/);
    if (pathname === '/mobile' || pathname.startsWith('/mobile/')) {
        if (extname(pathname)) return sendStatus(res, 404, 'Not Found');
        const index = await fileAt('/mobile/index.html');
        return index ? send(res, index) : sendStatus(res, 404, 'Not Found');
    }
    if (snapshot) {
        if (extname(snapshot[3] || '')) return sendStatus(res, 404, 'Not Found');
        const suffix = snapshot[1] === 'versions' && /^rp(?:\/|$)/.test(snapshot[3] || '') ? 'rp/index.html' : (snapshot[3] || '').startsWith('mobile/') || snapshot[3] === 'mobile' ? 'mobile/index.html' : 'index.html';
        const index = await fileAt(`/${snapshot[1]}/${snapshot[2]}/${suffix}`);
        return index ? send(res, index) : sendStatus(res, 404, 'Not Found');
    }
    if (pathname.startsWith('/versions/') || pathname === '/versions' || pathname.startsWith('/releases/') || pathname === '/releases' || pathname.startsWith('/assets/') || extname(pathname)) return sendStatus(res, 404, 'Not Found');

    // 3) 演示站回退到入口页，交给 BrowserRouter 解析深层路由
    const index = await fileAt('/index.html');
    return index ? send(res, index) : sendStatus(res, 404, 'Not Found');
});

server.listen(PORT, HOST, () => {
    console.log(`dist 静态服务已启动：http://${HOST}:${server.address().port}/`);
});
