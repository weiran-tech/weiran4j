import { useSnapshots } from './useSnapshots';
import { currentVersion, siteBase } from './catalog';
import { repository } from '../../prototype/project.mjs';

export function CandidatePanel({ version = currentVersion }: { version?: string }) {
    const snapshots = useSnapshots();
    const candidates = (snapshots.data || []).filter((item) => item.kind === 'candidate' && item.prototypeVersion === version).sort((a, b) => b.builtAt.localeCompare(a.builtAt));
    const running = candidates.find((item) => item.base === siteBase);
    return <section className="proto-card"><h2>固定评审构建</h2><p>{running ? `正在查看固定候选：${running.version}。提交 ${running.commit}` : '正式评审使用固定候选，候选不会自动定稿。'}</p>
        <a target="_blank" rel="noreferrer" href={`https://github.com/${repository}/actions/workflows/candidate.yml`}>生成候选 / 查看构建 ↗</a>
        {candidates.length ? <ul>{candidates.map((item) => <li key={item.version}><a href={`${item.base}${item.routeSchema === 2 ? 'rp' : 'prototype'}/workflow?version=${version}`}>{item.commit.slice(0, 12)} · {item.builtAt} · 打开固定交接工作台</a></li>)}</ul> : <p>此版本尚无可访问的固定候选。</p>}
        {snapshots.isError && <p role="alert">候选索引读取失败，请刷新重试。</p>}
    </section>;
}
