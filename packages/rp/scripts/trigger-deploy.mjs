const hook = process.env.VERCEL_DEPLOY_HOOK;
if (!hook) { console.log('未配置部署 Hook，已生成可下载部署包；未触发线上发布。'); process.exit(0); }
let url;
try { url = new URL(hook); } catch { throw new Error('部署 Hook 格式不正确'); }
if (url.protocol !== 'https:' || url.hostname !== 'api.vercel.com' || !/^\/v1\/integrations\/deploy\/[^/]+\/[^/]+$/.test(url.pathname)) throw new Error('请使用 Vercel 项目设置生成的 HTTPS Deploy Hook');
try {
    const response = await fetch(url, { method: 'POST', redirect: 'error' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('已触发 Vercel 重新构建，发布状态请在 Vercel 项目中查看。');
} catch { throw new Error('部署 Hook 调用失败，请在项目设置中检查；Hook 地址不会写入日志。'); }
