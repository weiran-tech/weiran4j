import { notebookContext } from './notebook-context';
import { openVersionNotebook } from './version-notes';
import { globalPath } from '../../prototype/routes.mjs';
import { useWorkspaceNavigate } from '@/prototype/navigation';
import { Button, SideSheet, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ReviewLinks } from './ReviewLinks';
import { ChangeDetails } from './ChangeDetails';
import { readingPath } from './workspaces';
import { readingRelease, readingVersion, reviewLink, pagePaths, sitePath, statusLabels, siteBase } from './catalog';
import { runtimeVersion } from './runtime';

export function ReviewToolbar() {
    const currentRelease = readingRelease()!; const currentVersion = readingVersion();
    const location = useLocation();
    const navigate = useWorkspaceNavigate();
    const params = new URLSearchParams(location.search);
    const backToVersion = readingPath('/rp/versions', location.search);
    const fixedCandidate = siteBase.startsWith('/releases/') ? siteBase.split('/')[2] : null;
    const [opened, setOpened] = useState(false);
    const changes = currentRelease.changes.filter((change) => change.platform === 'manage' && pagePaths(change).after?.split('?')[0] === location.pathname);
    const selected = changes.find((change) => change.id === params.get('change'));
    const mismatch = Boolean(params.get('version') && params.get('version') !== currentVersion);
    const missingChange = params.get('change') && !selected;
    const visible = opened || (params.get('review') === '1' && (changes.length > 0 || mismatch || Boolean(missingChange)));
    function close() {
        setOpened(false);
        params.delete('review');
        params.delete('change');
        void navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
    if (globalPath(location.pathname) !== null || location.pathname.startsWith('/rp/')) return null;
    if (currentVersion !== runtimeVersion || mismatch && ['/manage', '/rp/mobile', '/rp/versions', '/rp/workflow'].includes(location.pathname)) return <div className="proto-toolbar">
        <a href={sitePath(backToVersion)} onClick={(event) => { event.preventDefault(); void navigate(backToVersion); }}>返回本版改动</a>
        <span>所选版本 {currentVersion} · 目录与说明</span><span className="proto-toolbar-context">历史页面仅使用对应固定快照</span>
    </div>;
    return <div className="proto-toolbar">
        <a href={sitePath(backToVersion)} onClick={(event) => { event.preventDefault(); void navigate(backToVersion); }}>返回本版改动</a>
        <span>{currentVersion} · {statusLabels[currentRelease.status]} · {fixedCandidate ? `固定候选 ${fixedCandidate.slice(-12)}` : '当前工作构建'}</span>
        <Button size="small" onClick={async () => { try { const { openReviewCapture } = await import('./review-capture'); openReviewCapture({ version: currentVersion, baseline: currentRelease.baseline, platform: 'manage', page: location.pathname, pageUrl: window.location.href, scenario: params.get('scenario') || 'normal', ...((selected || changes[0]) ? { change: selected || changes[0], pageId: (selected || changes[0])?.pageId } : {}) }); } catch { Toast.error('截图工具加载失败，请重试'); } }}>截图标注</Button>
        <Button size="small" onClick={() => { const context = notebookContext(currentVersion); if (context) openVersionNotebook(context); }}>评审备注 · ⌘/Ctrl⇧E</Button><Button size="small" onClick={() => setOpened(true)}>本页改动 {changes.length}</Button>
        {mismatch && <span role="alert">链接请求 {params.get('version')}，当前构建为 {currentVersion}，请从版本中心打开对应快照。</span>}
        <SideSheet title={`本页改动 · ${currentVersion}`} visible={visible} onCancel={close} width={Math.min(520, window.innerWidth)}>
            {missingChange && <p role="alert">本页没有改动 {params.get('change')}，请检查分享链接。</p>}
            <ReviewLinks context={{ version: currentVersion, baseline: currentRelease.baseline, platform: 'manage', page: location.pathname, pageUrl: window.location.href, scenario: params.get('scenario') || 'normal' }} />
            {mismatch ? <p>请先打开链接对应的历史版本，再查看改动说明。</p> : changes.length === 0 ? <p>本版本未登记此页面的改动。</p> : (selected ? [selected, ...changes.filter((change) => change !== selected)] : changes).map((change) => <div key={change.id}>
                <ChangeDetails change={change} /><ReviewLinks context={{ version: currentVersion, baseline: currentRelease.baseline, change, platform: change.platform, pageId: change.pageId, page: change.page, scenario: params.get('scenario') || 'normal', pageUrl: window.location.href }} />
                <Button onClick={async () => { try { await navigator.clipboard.writeText(reviewLink(change, currentVersion, params.get('scenario') || 'normal')); Toast.success('已复制评审链接'); } catch { Toast.warning('复制失败，请从地址栏复制链接'); } }}>复制此项链接</Button>
            </div>)}
        </SideSheet>
    </div>;
}
