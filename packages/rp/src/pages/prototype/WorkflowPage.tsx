import { VersionNotesButton } from '@/prototype/VersionNotesButton';
import { workErrors } from '../../../prototype/version-work.mjs';
import resolutions from '../../../prototype/conflict-resolutions.json';
import { PageConflictNotice } from '@/prototype/PageConflictNotice';
import { PortalLink } from '@/prototype/PortalRouter';
import { Tag, Tabs } from '@douyinfe/semi-ui';
import { useMemo } from 'react';
import { useVersionParams } from '@/prototype/useVersionParams';
import { handoffIssueUrl, approvalCommand, blankHandoff, normalizeHandoff, workflowStages, workflowStage } from '../../../prototype/handoff.mjs';
import { currentRelease, releases, sitePath, type Release } from '@/prototype/catalog';
import { useSnapshots } from '@/prototype/useSnapshots';
import { useHandoffs } from '@/prototype/useHandoffs';
import { reviewReference } from '../../../prototype/review-source.mjs';
import { ReviewLinks } from '@/prototype/ReviewLinks';
import { repository } from '../../../prototype/project.mjs';
import VersionsPage from './VersionPrototypePanel';
import '@/prototype/prototype.css';

export default function WorkflowPage() {
    const [params] = useVersionParams();
    const release = releases.find((item) => item.id === params.get('version')) || currentRelease;
    return <div className="proto-page">{params.has('version') && params.get('version') !== release.id && <p role="alert">找不到请求的版本，当前显示 {release.id}。</p>}<VersionOverview key={release.id} release={release} /></div>;
}
function VersionOverview({ release }: { release: Release }) {
    const [params, setParams] = useVersionParams();
    const tab = params.get('tab') === 'review' ? 'review' : 'prototype';
    function setTab(value: string) { const next = new URLSearchParams(params); next.set('tab', value); setParams(next); }
    const snapshots = useSnapshots();
    const report = useHandoffs();
    const synced = report.data?.versions[release.id];
    const draft = useMemo(() => normalizeHandoff(synced?.handoff || blankHandoff(release), release), [synced?.handoff, release]);
    const candidate = snapshots.data?.find((item) => item.kind === 'candidate' && item.prototypeVersion === release.id && item.version === draft.candidateId && item.fingerprint);
    const reviewRef = reviewReference(release.id);
    const issueUrl = reviewRef?.url || handoffIssueUrl(repository, release, draft);
    const stage = workflowStage(draft, release);
    const blocked = !release.supersededBy && workErrors(release, releases, resolutions).length > 0;
    return <>
        <section className="proto-card proto-version-overview">
            <div className="proto-heading"><div><h1>{release.id} · {release.title}</h1><p>{release.goal}</p></div><Tag color={stage === 'accepted' ? 'green' : 'blue'}>{!synced?.handoff ? '阶段待同步' : workflowStages[stage]}</Tag></div>
            <div className="proto-heading"><div className="proto-actions">{!release.supersededBy && release.status !== 'finalized' && <PortalLink href={sitePath('/rp/editor', release.id)}>编辑版本记录</PortalLink>}<PortalLink href="/help">帮助</PortalLink><VersionNotesButton version={release.id} /></div></div>
            <section className="proto-maintenance" aria-label="维护"><h2>维护</h2><p>基线 {release.baseline || '无'} · {release.changes.length} 项改动 · {synced?.updatedAt ? `共享摘要更新：${synced.updatedAt}` : '共享摘要尚未同步，评审结果以 GitHub 为准。'}</p><PortalLink href="/help/deployment">维护指南</PortalLink></section>
            {release.supersededBy && <p className="proto-muted">由 <PortalLink href={sitePath('/rp/versions', release.supersededBy)}>{release.supersededBy}</PortalLink> 承接，历史记录只读。</p>}
            {report.isError && <p role="alert">摘要加载失败，请直接查看 GitHub。</p>}
        </section>
        <Tabs type="line" activeKey={tab} onChange={setTab} className="proto-version-tabs">
            <Tabs.TabPane itemKey="prototype" tab="原型与改动">{blocked ? <><p role="alert">{workErrors(release, releases, resolutions).join('；')}。请先解决后再工作。</p><PageConflictNotice release={release} /></> : <VersionsPage embedded withCatalog />}</Tabs.TabPane>
            <Tabs.TabPane itemKey="review" tab="评审与结论">
            <section className="proto-card"><h2>版本 Discussion</h2><ReviewLinks context={{ version: release.id, baseline: release.baseline }} /><p>每版一个 Discussion；按 CHG 和页面在评论串讨论，记录采用 / 暂缓 / 不采用。阻塞意见在顶层评论独立一行标记 prototype:blocker，产品本人在其回复中记录决策与证据。</p>{reviewRef?.kind === 'issue' && <p className="proto-muted">本版仍登记在历史 Issue。迁移时先将完整交接正文复制到新 Discussion，再执行 pnpm version:review -- {release.id} discussion:编号；登记提交后才切换共享来源，旧记录继续保留。</p>}</section>
            <section className="proto-card"><h2>评审依据</h2><p>产品：{draft.productOwner || '待指定'} · 技术：{draft.technicalOwner || '待指定'}</p><p>固定候选：{draft.candidateUrl ? <PortalLink href={draft.candidateUrl}>{draft.candidateId}</PortalLink> : draft.candidateId || '尚未固定'}</p><p>演示与验收数据：{draft.testData || '待补充'}</p></section>
            <section className="proto-card"><h2>问题与处理结论</h2><p>采用：更新原型和说明后复核；暂缓：说明原因并关联后续任务；不采用：说明原因并由产品确认。讨论结束不等于版本批准。</p><PortalLink href={reviewRef?.kind === 'discussion' ? reviewRef.url : `https://github.com/${repository}/issues?q=${encodeURIComponent(`is:issue in:body "prototype-review:${release.id}"`)}`} target="_blank" rel="noreferrer">查看 GitHub 实时问题 ↗</PortalLink>
                {synced?.problems?.length ? <ul>{synced.problems.map((problem) => <li key={problem.number}><PortalLink href={problem.url} target="_blank" rel="noreferrer">#{problem.number} {problem.title}</PortalLink> · {problem.state === 'closed' ? '已关闭' : '待处理'}{problem.blocker ? ' · 阻塞' : ''} · 负责人 {problem.owners.join('、') || '待指定'} · {({ adopted: '采用', deferred: '暂缓', rejected: '不采用' } as Record<string, string>)[problem.decision || ''] || '待产品确认结论'}</li>)}</ul> : <p>摘要中尚无问题记录，请以 GitHub 实时列表为准。</p>}
                <details><summary>记录产品本人处理结论</summary><p>在阻塞评论串下回复：<code>/prototype resolve {release.id} adopted</code>（采用）；也可用 deferred（暂缓）、rejected（不采用）。另起行填写“原因：…”和“证据：https://…”，暂缓另填“承接：https://…”。采用后更新原型，再保留复核证据；独立缺陷或研发任务再关联 Issue。</p></details>
            </section>
            <section className="proto-card"><h2>确认与定稿</h2><p>产品和技术本人确认当前候选。维护者通过在线门禁归档后，页面才显示已定稿；申请操作不会在本机伪造定稿。</p>
                {candidate?.fingerprint ? <details><summary>查看本人确认命令</summary><p>产品批准：<code className="proto-command">{approvalCommand('product', { ...candidate, fingerprint: candidate.fingerprint })}</code></p><p>技术确认：<code className="proto-command">{approvalCommand('technical', { ...candidate, fingerprint: candidate.fingerprint })}</code></p><p>在主评审记录 本人评论。撤回：<code>/prototype revoke {candidate.version}</code>。产品最终批准须晚于全部阻塞关闭与复核。</p></details> : <p>选择已生成候选后显示本人确认命令。</p>}
                {synced?.errors.length ? <details open><summary>共享记录尚有 {synced.errors.length} 项待核对</summary><ul>{synced.errors.map((error) => <li key={error}>{error}</li>)}</ul></details> : <p>审批与阻塞的最终结果以维护者执行在线定稿检查为准。</p>}
                <PortalLink href={issueUrl} target="_blank" rel="noreferrer">查看主评审记录 ↗</PortalLink>
            </section>

            </Tabs.TabPane>
        </Tabs>
    </>;
}
