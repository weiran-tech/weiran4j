import { access, cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import catalog from '../prototype/releases.json' with { type: 'json' };
import { versionBase } from '../prototype/routes.mjs';
import { buildMetadata } from './prototype-build-plugin.mjs';

const root = new URL('../', import.meta.url);
const manage = new URL('.prototype-data/web-build/', root);
const archives = new URL('.prototype-archives/', root);
const output = new URL('dist/', root);

// 先检查两份产物，避免构建不完整时清空现有发布目录。
await Promise.all([
  access(new URL('index.html', manage)),
  access(new URL('mobile/index.html', manage)),
  access(new URL('.prototype-data/current-version/index.html', root)),
]);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(manage, output, { recursive: true });
// Git 提交不参与 Turbo 内容缓存；当前站点在组装时刷新身份，历史归档保持原样。
const identity = buildMetadata();
if (identity.base !== '/' || identity.kind !== 'working') throw new Error('完整站点必须以当前工作构建组装');
await writeFile(new URL('prototype-build.json', output), JSON.stringify(identity, null, 2));
const productIdentity = JSON.parse(await readFile(new URL('product-pages.json', output), 'utf8'));
await writeFile(new URL('product-pages.json', output), JSON.stringify({ ...productIdentity, commit: identity.commit }, null, 2));
const working = new URL('.prototype-data/current-version/', root);
const workingMetadata = JSON.parse(await readFile(new URL('prototype-build.json', working), 'utf8'));
if (workingMetadata.base !== versionBase(catalog.current) || workingMetadata.prototypeVersion !== catalog.current || workingMetadata.commit !== identity.commit) throw new Error('当前版本独立构建身份不一致');
await cp(working, new URL(`versions/${catalog.current}/`, output), { recursive: true });
await writeFile(new URL('versions/index.json', output), JSON.stringify([workingMetadata], null, 2));
// 各版本说明使用路径上下文；历史业务代码仍只从固定快照读取。
for (const release of catalog.releases) {
  const portal = new URL(`versions/${release.id}/rp/`, output);
  await mkdir(portal, { recursive: true });
  await cp(new URL('index.html', manage), new URL('index.html', portal));
}
// 带路由规则的静态服务器一并放进产物：Vercel 靠 vercel.json，其他环境靠它，
// 否则演示站是 history 路由，刷新深层地址会 404。产物因此可独立运行。
await cp(new URL('scripts/serve-dist.mjs', root), new URL('serve.mjs', output));
console.log(`站点已合并至 dist/：原型 /rp，管理端 /manage，手机端 /mobile；独立版本 ${versionBase(catalog.current)}；服务器 dist/serve.mjs`);

const snapshots = [];
for (const name of await readdir(archives).catch((error) => { if (error.code === 'ENOENT') return []; throw error; })) {
  if (!/^v[\w.-]+$/.test(name)) throw new Error(`归档目录无效：${name}`);
  const dir = new URL(`${name}/`, archives);
  const metadata = JSON.parse(await readFile(new URL('prototype-build.json', dir), 'utf8'));
  if (metadata.version !== name || metadata.base !== `/releases/${name}/` || !/^[a-f0-9]{40}$/.test(metadata.commit)) throw new Error(`归档元数据不匹配：${name}`);
  await access(new URL('index.html', dir));
  await cp(dir, new URL(`releases/${name}/`, output), { recursive: true });
  snapshots.push(metadata);
}
await mkdir(new URL('releases/', output), { recursive: true });
await writeFile(new URL('releases/index.json', output), JSON.stringify(snapshots, null, 2));
console.log(`手机端 /mobile/，历史快照 ${snapshots.length} 个。`);

await mkdir(new URL('handoffs/', output), { recursive: true });
try { await cp(new URL('.prototype-data/handoffs.json', root), new URL('handoffs/index.json', output)); }
catch (error) { if (error.code !== 'ENOENT') throw error; await writeFile(new URL('handoffs/index.json', output), JSON.stringify({ syncedAt: null, versions: {} })); }
