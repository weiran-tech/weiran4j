import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
/** 排除协作记录与文档；仅规范化当前版本的发布状态，业务说明和源码变化会使批准失效。 */
export function reviewFingerprint(root = process.cwd()) {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).filter((path) => !path.startsWith('docs/') && !path.startsWith('.github/') && !['README.md', 'prototype/review-policy.json', 'prototype/hosting.json'].includes(path)).sort();
    const hash = createHash('sha256');
    for (const path of files) {
        let value = readFileSync(`${root}/${path}`);
        if (path === 'prototype/releases.json') { const data = JSON.parse(value); const current = data.releases.find((item) => item.id === data.current); current.status = 'review'; current.sourceCommit = null; value = JSON.stringify(data); }
        hash.update(path); hash.update('\0'); hash.update(value); hash.update('\0');
    }
    return hash.digest('hex');
}
