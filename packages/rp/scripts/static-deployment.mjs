/** 按内容摘要复用平台已有资源，只补齐缺失文件。 */
export async function createStaticDeployment(files, settings, { headers, query = '', fetchImpl = fetch, inlineLimit = 3_000_000, log = console.log }) {
    const refs = files.map(({ file, sha, size }) => ({ file, sha, size }));
    const inline = new Set();
    for (let attempt = 0; attempt < 5; attempt++) {
        const entries = files.map((item, index) => inline.has(item.sha) ? { file: item.file, data: item.content.toString('base64'), encoding: 'base64' } : refs[index]);
        const response = await fetchImpl(`https://api.vercel.com/v13/deployments${query}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, files: entries }) });
        const value = await response.json();
        if (response.ok) return value;
        if (value.error?.code !== 'missing_files' || !Array.isArray(value.error.missing) || !value.error.missing.length) throw new Error(`托管部署创建失败（HTTP ${response.status}，${value.error?.code || '未知错误'}）`);
        const missing = new Map();
        for (const record of value.error.missing) {
            const id = typeof record === 'string' ? record : record.sha || record.digest || record.file;
            const item = files.find((file) => file.sha === id || file.file === id);
            if (!item) throw new Error('平台返回无法识别的缺失资源，已停止部署');
            missing.set(item.sha, item);
        }
        const candidate = new Set([...inline, ...missing.keys()]);
        const bytes = files.reduce((sum, item) => sum + (candidate.has(item.sha) ? Math.ceil(item.size / 3) * 4 : 0), Buffer.byteLength(JSON.stringify(settings)) + Buffer.byteLength(JSON.stringify(refs)));
        if (bytes <= inlineLimit) {
            for (const sha of missing.keys()) inline.add(sha);
            log(`复用已有资源；补齐 ${missing.size} 个缺失资源（小文件随部署请求提交）`);
        } else {
            // 首次部署或大文件才调用上传接口，既有历史附件不重复上传。
            for (const item of missing.values()) {
                const upload = await fetchImpl(`https://api.vercel.com/v2/files${query}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': item.sha, 'Content-Length': String(item.size) }, body: item.content });
                if (!upload.ok) throw new Error(`缺失资源上传失败（HTTP ${upload.status}）；既有线上版本保持不变`);
            }
            log(`已补齐 ${missing.size} 个缺失资源，其他资源使用已有摘要`);
        }
    }
    throw new Error('平台仍报告缺失资源，未确认部署成功');
}
