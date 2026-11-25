import { useLayoutEffect, useRef, useState } from 'react';
import { Dropdown, Select } from '@douyinfe/semi-ui';
import { ChevronDown } from 'lucide-react';
import { helpEntries, helpPath } from '@/prototype/help-menu';
import { Outlet, useLocation } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { config } from '@/config';
import { PortalLink } from '@/prototype/PortalRouter';
import { currentVersion, releases } from '@/prototype/catalog';
import { useVersionParams } from '@/prototype/useVersionParams';
import { ThemeModeButton } from './ThemeSwitcher';
import './PortalLayout.css';

function HelpNavigation() {
    const { pathname } = useLocation();
    const [opened, setOpened] = useState(false);
    const help = pathname.startsWith('/help');
    const article = pathname.replace(/^\/help\/?/, '') || 'start';
    return <Dropdown trigger="click" position="bottomLeft" visible={opened} onVisibleChange={setOpened} render={
        <Dropdown.Menu className="portal-help-menu">{helpEntries.map((entry) => <Dropdown.Item key={entry.id} active={help && article === entry.id}>
            <PortalLink href={helpPath(entry.id)} aria-current={help && article === entry.id ? 'page' : undefined} onClick={() => setOpened(false)}>{entry.title}</PortalLink>
        </Dropdown.Item>)}</Dropdown.Menu>
    }><button type="button" className="portal-help-trigger" data-active={help || undefined} aria-haspopup="menu" aria-expanded={opened} onClick={() => setOpened(!opened)}>帮助文档<ChevronDown size={14} aria-hidden="true" /></button></Dropdown>;
}

function VersionNavigation() {
    const [params, setParams] = useVersionParams();
    const version = params.get('version') || currentVersion;
    const { pathname } = useLocation();
    return <nav className="portal-version-nav" aria-label="版本导航">
        <PortalLink href="/versions">← 版本清单</PortalLink>
        {pathname !== '/rp/editor' && <div className="portal-version-switcher"><span id="portal-version-label">查看版本</span><Select className="portal-version-select" aria-labelledby="portal-version-label" aria-label="查看版本" value={version} optionList={releases.map((release) => ({ value: release.id, label: `${release.id} · ${release.title}` }))} onChange={(value) => {
            const next = new URLSearchParams(params);
            next.set('version', String(value));
            for (const key of ['change', 'page', 'baseline', 'scene', 'step']) next.delete(key);
            setParams(next);
        }} /></div>}
    </nav>;
}

/** 首页、版本协作与文档共用公共外壳。 */
export function PortalLayout() {
    const { pathname } = useLocation();
    const versionPage = /^\/rp\/(versions|workflow|editor|demo|scenes)$/.test(pathname);
    const container = useRef<HTMLDivElement>(null);
    // 文章切换从顶部开始；正文的锚点 effect 在布局更新后继续定位目标章节。
    useLayoutEffect(() => { if (container.current) container.current.scrollTop = 0; }, [pathname]);
    return <div ref={container} className="portal-layout"><a className="portal-skip" href="#portal-content">跳到正文</a><header className="portal-header"><div className="portal-header-inner">
        <PortalLink href="/" className="portal-brand"><AppLogo size={32} /><span>{config.appTitle}<small>产品原型协作</small></span></PortalLink>
        <nav aria-label="主导航"><PortalLink href="/" aria-current={pathname === '/' ? 'page' : undefined}>首页</PortalLink><PortalLink href="/versions" aria-current={pathname === '/versions' || versionPage ? 'page' : undefined}>版本管理</PortalLink><HelpNavigation /></nav>
        <div className="portal-header-actions"><ThemeModeButton /></div>
    </div></header><main id="portal-content" className="portal-content">{versionPage && <VersionNavigation />}<Outlet /></main><footer className="portal-footer"><span>{config.appTitle} · 产品制作、版本管理与评审</span><PortalLink href="/help/product">了解如何使用 AI 制作原型 →</PortalLink></footer></div>;
}
