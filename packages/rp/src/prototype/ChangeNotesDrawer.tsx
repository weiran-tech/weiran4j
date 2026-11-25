import { Button, SideSheet, Tag, Toast } from '@douyinfe/semi-ui';
import { ChangeDetails } from './ChangeDetails';
import { ReviewLinks } from './ReviewLinks';
import { currentVersion, pagePaths, previewTarget, releases, siteBase, sitePath, typeLabels, type Change, type Release } from './catalog';
import { useSnapshots } from './useSnapshots';

/** 目录与版本记录共用说明抽屉；内容只读取仓库登记。 */
export function ChangeNotesDrawer({ release, changes, visible, onClose, technical = false, scenario = 'normal' }: { release: Release; changes: Change[]; visible: boolean; onClose: () => void; technical?: boolean; scenario?: string }) {
    const snapshots = useSnapshots();
    return <SideSheet title={`改动说明 · ${release.id}`} visible={visible} onCancel={onClose} width={Math.min(680, window.innerWidth)}>
        {changes.length === 0 && <p>本版本未登记此页面的改动。</p>}
        {changes.map((change) => {
            const paths = pagePaths(change);
            const removed = !paths.after;
            const target = previewTarget(removed ? releases.find((item) => item.id === release.baseline) : release, snapshots.data || [], currentVersion, siteBase, removed ? paths.before : paths.after, removed ? undefined : change.id, scenario);
            return <section key={change.id} className="proto-notes-item">
                <Tag>{typeLabels[change.type]} · {change.platform === 'mobile' ? '手机端' : '管理端'} · {change.pageTitle || change.location}</Tag>
                <ChangeDetails change={change} technical={technical} />
                <div className="proto-actions">{target.url ? <a href={target.url} target="_blank" rel="noreferrer">{removed ? '查看删除前页面' : '打开此版原型'} ↗</a> : <span className="proto-muted">{target.reason}</span>}<Button onClick={async () => { try { await navigator.clipboard.writeText(new URL(sitePath(`/rp/versions?change=${change.id}`, release.id), window.location.origin).href); Toast.success('已复制改动说明链接'); } catch { Toast.warning('复制失败，请复制地址栏链接'); } }}>复制说明链接</Button></div>
                <details><summary>此项评审</summary><ReviewLinks context={{ version: release.id, baseline: release.baseline, change, platform: change.platform, pageId: change.pageId, page: change.page, scenario, pageUrl: target.url ? new URL(target.url, window.location.origin).href : undefined }} /></details>
            </section>;
        })}
    </SideSheet>;
}
