import { fileURLToPath } from 'node:url';
import { archiveDevMiddleware } from './archive-dev.mjs';
import { readManifest } from './load-prototype.mjs';
import { versionBase } from '../prototype/routes.mjs';
import { buildMetadata } from './prototype-build-plugin.mjs';
import { readFile } from 'node:fs/promises';
/** 一个 Vite 服务提供两端入口，只补共享交接摘要与历史快照。 */
export function prototypeDevPlugin() {
    return { name: 'prototype-development', configureServer(server) {
        server.middlewares.use((req, res, next) => {
            const catalog = readManifest();
            const base = versionBase(catalog.current);
            const path = new URL(req.url || '/', 'http://localhost').pathname;
            const metadata = { ...buildMetadata(), base };
            if (path === '/versions/index.json' || path === `${base}prototype-build.json`) { res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-cache'); res.end(JSON.stringify(path === '/versions/index.json' ? [metadata] : metadata)); return; }
            if (path.startsWith('/versions/') && path !== '/versions/') {
                const portal = path.match(/^\/versions\/(v[\w.-]+)\/rp(?:\/|$)/);
                const portalBase = portal && catalog.releases.some((item) => item.id === portal[1]) ? versionBase(portal[1]) : null;
                if (!path.startsWith(base) && !portalBase) { res.statusCode = 404; res.end('此版本没有工作构建，请使用归档入口'); return; }
                req.url = req.url.slice((portalBase || base).length - 1);
            }
            next();
        });
        server.middlewares.use(archiveDevMiddleware(fileURLToPath(new URL('../.prototype-archives/', import.meta.url))));
    } };
}
