import { Button, ButtonGroup } from '@douyinfe/semi-ui';
import { PortalLink } from '@/prototype/PortalRouter';
import { useVersionParams } from '@/prototype/useVersionParams';
import { currentRelease, releases, sitePath } from '@/prototype/catalog';
import { VersionPageDirectory } from '@/prototype/VersionPageDirectory';
import '@/prototype/prototype.css';

export default function PrototypeCatalogPage({ embedded = false, technical = false }: { embedded?: boolean; technical?: boolean } = {}) {
    const [params, setParams] = useVersionParams();
    const release = releases.find((item) => item.id === params.get('version')) || currentRelease;
    const platform = params.get('platform') === 'mobile' ? 'mobile' : params.get('platform') === 'manage' ? 'manage' : undefined;
    const scope = params.get('scope') === 'all' ? 'all' : 'version';
    function update(key: 'scope' | 'platform', value: string) {
        const next = new URLSearchParams(params);
        next.set(key, value);
        if (key === 'scope') next.delete('step');
        setParams(next);
    }
    return <div className={embedded ? undefined : 'proto-page'}>
        {!embedded && <header className="proto-heading"><div><h1>原型演示</h1><p>{release.id} · 按模块选择页面，体验交互。</p></div><PortalLink href={sitePath('/rp/versions', release.id)}>版本改动与评审 →</PortalLink></header>}
        <VersionPageDirectory release={release} {...(platform ? { platform } : {})} browse technical={technical} scopeControls={<>
            <ButtonGroup aria-label="查看范围">{([{ value: 'all', label: '完整产品' }, { value: 'version', label: '本版改动' }] as const).map((item) => <Button key={item.value} theme={scope === item.value ? 'solid' : 'light'} aria-pressed={scope === item.value} onClick={() => update('scope', item.value)}>{item.label}</Button>)}</ButtonGroup></>} filters={<ButtonGroup aria-label="适用端">{([{ value: 'all', label: '全部' }, { value: 'manage', label: '管理端' }, { value: 'mobile', label: '手机端' }] as const).map((item) => <Button key={item.value} theme={(platform || 'all') === item.value ? 'solid' : 'light'} aria-pressed={(platform || 'all') === item.value} onClick={() => update('platform', item.value)}>{item.label}</Button>)}</ButtonGroup>} />
    </div>;
}
