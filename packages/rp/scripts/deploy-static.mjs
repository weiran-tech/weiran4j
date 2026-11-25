/** 只上传已验证的静态产物；Vercel 凭证不传给安装、构建或浏览器。 */
import { readdir, readFile, stat, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createStaticDeployment } from './static-deployment.mjs';
async function outcome(status, url = '') {
    const artifactOnly = status === 'artifact_only';
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `deployment_status=${status}\ndeployment_url=${url}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### ${artifactOnly ? '部署包已生成，线上未更新' : '线上部署已就绪'}\n\n${artifactOnly ? '未配置 VERCEL_TOKEN。请下载 prototype-site 由维护者发布，或在仓库 Actions Secrets 配置凭证。工作流成功仅表示检查与产物完成。' : `Vercel READY：${url}`}\n`);
}
const token = process.env.VERCEL_TOKEN;
if (!token) { await outcome('artifact_only'); console.log('未配置 VERCEL_TOKEN，已保留 GitHub 部署包；本次未自动更新托管站点。'); process.exit(0); }
const config = JSON.parse(await readFile('prototype/hosting.json', 'utf8'));
const rootConfig = JSON.parse(await readFile('vercel.json', 'utf8'));
const staticConfig = { cleanUrls: true, redirects: rootConfig.redirects, rewrites: rootConfig.rewrites, headers: rootConfig.headers };
const files = [];
async function walk(directory, prefix = '') {
    for (const name of await readdir(directory)) {
        const path = join(directory, name); const file = prefix + name;
        if ((await stat(path)).isDirectory()) await walk(path, file + '/');
        else if (file !== 'serve.mjs') files.push({ file, content: await readFile(path) });
    }
}
await walk('dist'); files.push({ file: 'vercel.json', content: Buffer.from(JSON.stringify(staticConfig)) });
const headers = { Authorization: `Bearer ${token}` }; const query = `?teamId=${config.teamId}`;
for (const item of files) {
    item.sha = createHash('sha1').update(item.content).digest('hex'); item.size = item.content.length;
}
const deployment = await createStaticDeployment(files, { name: config.projectName, project: config.projectId, target: 'production', projectSettings: { framework: null, buildCommand: '', installCommand: '', outputDirectory: '', nodeVersion: '24.x' } }, { headers, query });
for (let index = 0; index < 80; index++) {
    const status = await fetch(`https://api.vercel.com/v13/deployments/${deployment.id}${query}`, { headers });
    if (!status.ok) throw new Error('无法核实托管部署状态');
    const value = await status.json();
    if (value.readyState === 'READY') { await outcome('ready', `https://${value.url}`); console.log(`静态站点已部署：https://${value.url}`); process.exit(0); }
    if (['ERROR', 'CANCELED'].includes(value.readyState)) throw new Error('托管部署未成功，请检查 Vercel 构建记录');
    await new Promise((resolve) => setTimeout(resolve, 3000));
}
throw new Error('部署仍未就绪，请核对托管状态；不将已触发视为成功');
