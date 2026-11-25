import { readingPath, readingScope, readingRelease } from '@/prototype/workspaces';
import { VersionPageDirectory } from '@/prototype/VersionPageDirectory';
import { currentVersion, sitePath } from '@/prototype/catalog';
import { useLocation } from 'react-router-dom';
import '@/prototype/prototype.css';

export default function ManageGuidePage() {
    const location = useLocation();
    const scope = readingScope(location.search); const release = readingRelease(location.search);
    return <div className="proto-page"><header className="proto-heading"><div><div className="proto-eyebrow">MANAGE · SEMI UI</div><h1>管理端产品导览</h1><p>{`${release?.id || '未知版本'} · ${scope === 'all' ? '完整产品' : '本版相关页面'}`}。选择页面直接查看原型。</p></div><a href={sitePath(readingPath('/rp/versions', location.search))}>返回本版改动</a></header>
        {release ? <VersionPageDirectory release={release} platform="manage" browse /> : <p role="alert">找不到所选版本，请重新选择。</p>}
        {scope === 'all' && release && release.id !== currentVersion && <p className="proto-guide-notice">历史完整目录保留在对应快照中，请从上方“查看 {release.id} 完整管理端原型”进入。此处不展示当前构建的业务菜单。</p>}
    </div>;
}
