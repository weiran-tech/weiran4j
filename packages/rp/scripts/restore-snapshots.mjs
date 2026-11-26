/** 仅在构建时使用 GitHub 凭证；归档中不包含凭证。 */
import { restoreArchive } from './archive-transfer.mjs';
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('请设置 GITHUB_REPOSITORY=owner/repo');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
async function api(path, binary = false) {
    const response = await fetch(`https://api.github.com/${path}`, { headers: { Accept: binary ? 'application/octet-stream' : 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) throw new Error(`GitHub 归档读取失败（HTTP ${response.status}）`);
    return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
}
const releases = [];
for (let page = 1; ; page++) {
    const items = await api(`repos/${repo}/releases?per_page=100&page=${page}`);
    releases.push(...items); if (items.length < 100) break;
}
for (const release of releases) {
    if (release.draft || !/^v[\w.-]+$/.test(release.tag_name)) continue;
    const name = `${release.tag_name}.tar.gz`;
    const asset = release.assets.find((item) => item.name === name);
    if (!asset) continue;
    await restoreArchive(await api(`repos/${repo}/releases/assets/${asset.id}`, true), release.tag_name);
}
console.log(`已检查 ${releases.length} 个 GitHub Release。`);
