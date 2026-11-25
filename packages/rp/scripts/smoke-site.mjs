/** 对已合并产物检查路由、资源、快照索引和真实提交，适用于本机与 CI。 */
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const directory = resolve(process.argv[2] || 'dist');
const child = spawn(process.execPath, [resolve('scripts/serve-dist.mjs')], { env: { ...process.env, DIST_ROOT: directory, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
    const port = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('预览服务器启动超时')), 10000);
        child.once('error', (error) => { clearTimeout(timeout); reject(error); });
        child.once('exit', () => { clearTimeout(timeout); reject(new Error('预览服务器提前退出')); });
        child.stdout.on('data', (value) => { const match = value.toString().match(/:(\d+)\//); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    });
    const origin = `http://127.0.0.1:${port}`;
    async function read(path) {
        const response = await fetch(origin + path);
        if (!response.ok) throw new Error(`${path} 返回 HTTP ${response.status}`);
        return response;
    }
    async function html(path, base) {
        const response = await read(path);
        const content = await response.text();
        if (!content.includes('<html')) throw new Error(`${path} 不是页面`);
        const resources = [...content.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]).filter((url) => url.startsWith('/') && /\.(js|css)$/.test(url));
        if (!resources.length || resources.some((url) => !url.startsWith(base))) throw new Error(`${path} 资源前缀不匹配 ${base}`);
        for (const url of resources) {
            const resource = await read(url);
            if (resource.headers.get('content-type')?.includes('text/html')) throw new Error(`${url} 错误回退为 HTML`);
        }
    }
    const current = await (await read('/prototype-build.json')).json();
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (current.commit !== commit || current.kind !== 'working' || current.base !== '/') throw new Error('当前站点构建身份与此提交不一致');
    await html('/rp/versions', '/assets/');
    await html('/versions', '/assets/');
    await html('/mobile/', '/assets/');
    await html('/rp', '/assets/');
    await html('/rp/help/review', '/assets/');
    await html('/docs/prototype', '/assets/');
    const versions = await (await read('/versions/index.json')).json();
    if (!Array.isArray(versions) || versions.length !== 1) throw new Error('当前工作版本索引无效');
    const working = versions[0];
    if (working.prototypeVersion !== current.prototypeVersion || working.commit !== commit || working.base !== `/versions/${current.prototypeVersion}/`) throw new Error('版本工作构建身份不一致');
    await html(`${working.base}rp/versions`, `/assets/`);
    await html(`/versions/v0.2/rp/versions`, `/assets/`);
    const product = await (await read(`${working.base}product-pages.json`)).json();
    if (!product.complete || product.version !== working.prototypeVersion || !product.pages.length) throw new Error('完整产品清单无效');
    await html(`${working.base}manage`, `${working.base}assets/`);
    await html(`${working.base}mobile/`, `${working.base}assets/`);
    for (const path of ['/versions/v-does-not-exist/manage', `${working.base}assets/missing.js`]) if ((await fetch(origin + path)).status !== 404) throw new Error(`${path} 不得回退为其他版本`);
    const snapshots = await (await read('/releases/index.json')).json();
    if (!Array.isArray(snapshots)) throw new Error('快照索引格式无效');
    for (const snapshot of snapshots) {
        const metadata = await (await read(`${snapshot.base}prototype-build.json`)).json();
        if (metadata.version !== snapshot.version || metadata.commit !== snapshot.commit || metadata.base !== snapshot.base) throw new Error(`快照索引与构建不一致：${snapshot.version}`);
        await html(`${snapshot.base}${snapshot.routeSchema === 2 ? 'rp' : 'prototype'}/versions`, `${snapshot.base}assets/`);
        await html(`${snapshot.base}mobile/`, snapshot.base);
    }
    if ((await fetch(origin + '/releases/v-does-not-exist/page')).status !== 404) throw new Error('缺失快照必须返回 404');
    console.log(`部署检查通过：管理端（含使用指南）、手机端，以及 ${snapshots.length} 个历史快照。`);
} finally { child.kill('SIGTERM'); }
