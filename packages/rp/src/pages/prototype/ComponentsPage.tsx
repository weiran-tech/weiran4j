import { useLocation } from 'react-router-dom';
import { useMyMenus } from '@/hooks/queries/auth';
import { flattenMenuPages } from '@/utils/menu';
import { readingPath } from '@/prototype/workspaces';
import { currentRelease, currentVersion, sitePath, siteBase, previewTarget } from '@/prototype/catalog';
import { useSnapshots } from '@/prototype/useSnapshots';
import '@/prototype/prototype.css';

export default function ComponentsPage() {
    const { data: menus = [] } = useMyMenus(); const location = useLocation(); const snapshots = useSnapshots();
    const pages = flattenMenuPages(menus).filter((item) => item.visible && item.path.startsWith('/manage/demo/'));
    const form = currentRelease.changes.find((item) => item.pageId === 'mobile-form');
    const target = previewTarget(currentRelease, snapshots.data || [], currentVersion, siteBase, form?.page || null, form?.id, 'normal', false);
    return <div className="proto-page"><header className="proto-heading"><div><div className="proto-eyebrow">COMPONENT EXAMPLES</div><h1>组件示例目录</h1><p>组件和交互用法参考。具体业务需求以版本中心的改动、规则和验收条件为准。</p></div><a href={sitePath(readingPath('/rp/versions', location.search))}>返回本版改动</a></header>
        <div className="proto-guide-grid"><section className="proto-card"><h2>管理端 · Semi</h2><p>列表、表单、配置、布局、权限和批处理用法。</p><ul>{pages.map((item) => <li key={item.id}><a href={sitePath(readingPath(item.path, location.search))}>{item.title}</a></li>)}</ul></section>
            <section className="proto-card"><h2>手机端 · Vant</h2><p>表单示例含输入、校验、提交、重置及异常状态。它不属于订单退款主流程。</p><a href={sitePath(`/rp/mobile?version=${currentVersion}&library=1&page=mobile%3Amobile-form`)}>在设备预览中查看</a>{target.url && <p><a href={target.url} target="_blank" rel="noreferrer">独立打开 Vant 表单示例 ↗</a></p>}</section></div>
    </div>;
}
