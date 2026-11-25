import { Tag } from '@douyinfe/semi-ui';
import { PortalLink } from '@/prototype/PortalRouter';
import { currentVersion, releases, sitePath, statusLabels } from '@/prototype/catalog';
import '@/prototype/prototype.css';

export default function VersionListPage() {
    return <div className="proto-page">
        <header className="proto-heading"><div><h1>版本清单</h1><p>选择版本，查看原型改动与评审结论。</p></div><div className="proto-actions"><PortalLink href={sitePath('/rp/editor?create=1')}>创建版本</PortalLink><PortalLink href="/help/versions">版本管理指南</PortalLink></div></header>
        <section aria-label="全部版本">
            <div className="proto-version-list">{releases.map((release) => <article className="proto-card" key={release.id} aria-label={`${release.id} 版本`}>
                <div className="proto-heading"><h3>{release.id} · {release.title}</h3><div className="proto-actions"><Tag>{statusLabels[release.status]}</Tag>{release.id === currentVersion && <Tag color="blue">当前</Tag>}</div></div>
                <p>{release.goal}</p>
                <div className="proto-heading"><p className="proto-muted">{release.date} · {release.changes.length} 项改动{release.supersededBy ? ` · 由 ${release.supersededBy} 承接` : ''}</p><PortalLink className="proto-open-button proto-version-enter" href={sitePath('/rp/versions', release.id)} aria-label={`查看 ${release.id} 详情`}>进入版本 →</PortalLink></div>
            </article>)}</div>
        </section>
    </div>;
}
