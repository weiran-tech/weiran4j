import { globalPath } from '../../prototype/routes.mjs';
import { useWorkspaceNavigate } from '@/prototype/navigation';
import { useId, useState } from 'react';
import { Select } from '@douyinfe/semi-ui';
import { useLocation } from 'react-router-dom';
import { currentVersion, releases, sitePath } from './catalog';
import { readingPath, readingScope, workspaceFor, type ReadingScope } from './workspaces';
import { routeVersion } from './runtime';
import { navigatePortal, PortalLink } from './PortalRouter';
import { RpScopeSwitch } from '@weiran-tech/prototype';
import './prototype.css';

export function WorkspaceSwitcher({ placement = 'all' }: { placement?: 'all' | 'header' | 'sidebar' }) {
    const versionLabelId = useId();
    const location = useLocation(); const navigate = useWorkspaceNavigate();
    const global = globalPath(location.pathname) !== null;
    const workspace = workspaceFor(location.pathname, location.search);
    // 全局首页只预选阅读条件，选择端后进入版本页面，首页地址始终保持 /rp。
    const [homeScope, setHomeScope] = useState<ReadingScope>('all');
    const [homeVersion, setHomeVersion] = useState(currentVersion);
    const scope = global ? homeScope : readingScope(location.search);
    const version = global ? homeVersion : routeVersion || new URLSearchParams(location.search).get('version') || currentVersion;
    const paths = { collaboration: '/rp/versions', manage: '/manage', mobile: '/rp/mobile' };
    function open(platform: keyof typeof paths, nextScope = scope, nextVersion = version) {
        const params = new URLSearchParams(global ? '' : location.search);
        for (const key of ['change', 'review', 'page', 'compare', 'library', 'doc', 'baseline']) params.delete(key);
        if (platform !== workspace) params.delete('tab');
        params.set('scope', nextScope); params.set('version', nextVersion);
        const destination = !global && platform === 'collaboration' && workspace === 'collaboration' ? location.pathname : paths[platform];
        const path = readingPath(destination, params.toString());
        if (global || nextVersion !== version) { const target = sitePath(`${destination}?${params}`, nextVersion); if (!navigatePortal(target)) window.location.assign(target); }
        else void navigate(path);
    }
    function selectScope(next: ReadingScope) {
        if (global) setHomeScope(next);
        else open(workspace, next);
    }
    const scopeControl = <RpScopeSwitch value={scope} onChange={selectScope} />;
    if (placement === 'sidebar') return <div className="admin-version-scope">{scopeControl}</div>;
    return <nav className="proto-workspaces" aria-label="工作区切换">{placement === 'all' && <><PortalLink href="/">协作首页</PortalLink>{scopeControl}</>}
        <div className="proto-version-control" role="group" aria-label="工作区版本"><span id={versionLabelId} hidden>工作区版本</span><Select className="proto-version-select" aria-labelledby={versionLabelId} value={version} dropdownMatchSelectWidth={false}
            optionList={[
                ...(!releases.some((item) => item.id === version) ? [{ value: version, label: `${version}（不存在）` }] : []),
                ...releases.map((release) => ({ value: release.id, label: `${release.id}${release.id === currentVersion ? '（当前）' : ''}` })),
            ]}
            onChange={(value) => { if (typeof value !== 'string') return; if (global) setHomeVersion(value); else open(workspace, scope, value); }} /></div>
        <div className="proto-platforms" role="group" aria-label="查看端">
            <button aria-pressed={!global && workspace === 'manage'} onClick={() => open('manage')}>管理端</button>
            <button aria-pressed={!global && workspace === 'mobile'} onClick={() => open('mobile')}>手机端</button>
        </div>
    </nav>;
}
