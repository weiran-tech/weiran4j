import { execFileSync } from 'node:child_process';
import catalog from '../prototype/releases.json' with { type: 'json' };
import baselines from '../prototype/page-baselines.json' with { type: 'json' };
import { completeProduct } from '../prototype/model.mjs';
export function buildMetadata() {
    let commit = 'unknown';
    try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* source archive */ }
    return { routeSchema: 2, version: process.env.VITE_PROTOTYPE_ARCHIVE_ID || process.env.VITE_PROTOTYPE_VERSION || catalog.current, prototypeVersion: process.env.VITE_PROTOTYPE_VERSION || catalog.current, kind: process.env.VITE_PROTOTYPE_KIND || 'working', fingerprint: process.env.VITE_PROTOTYPE_FINGERPRINT || null, base: process.env.VITE_PROTOTYPE_BASE || '/', commit, builtAt: new Date().toISOString() };
}
export function productManifest() {
    const identity = buildMetadata();
    const version = identity.prototypeVersion;
    const release = catalog.releases.find((item) => item.id === version);
    const product = completeProduct(catalog.releases, version, baselines);
    return { version, baseline: release?.baseline, commit: identity.commit, ...product };
}
export function prototypeBuildPlugin() {
    return { name: 'prototype-build-metadata', configureServer(server) { server.middlewares.use((req, res, next) => { const path = req.url?.split('?')[0]; if (!['/prototype-build.json', '/product-pages.json'].includes(path)) return next(); res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-cache'); res.end(JSON.stringify(path === '/product-pages.json' ? productManifest() : buildMetadata())); }); }, generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'prototype-build.json', source: JSON.stringify(buildMetadata(), null, 2) });
        const product = productManifest();
        if (!product.complete) throw new Error(`无法发布不完整的产品清单：${product.reason}`);
        this.emitFile({ type: 'asset', fileName: 'product-pages.json', source: JSON.stringify(product, null, 2) });
    } };
}
