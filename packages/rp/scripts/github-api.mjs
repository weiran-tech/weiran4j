export async function github(path, options = {}) {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    const response = await fetch(`https://api.github.com/${path}`, { ...options, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
    if (!response.ok) throw new Error(`GitHub 请求失败：${path.split('?')[0]}（HTTP ${response.status}）`);
    return response.json();
}
export async function allPages(path) {
    const result = [];
    for (let page = 1; ; page++) { const items = await github(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`); result.push(...items); if (items.length < 100) return result; }
}
