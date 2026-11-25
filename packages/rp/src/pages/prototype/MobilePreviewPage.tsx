import { Button, Toast } from '@douyinfe/semi-ui';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { useVersionParams } from '@/prototype/useVersionParams';
import { currentRelease, currentVersion, releases, pageDiffs, previewTarget, productFor, siteBase } from '@/prototype/catalog';
import { ReviewLinks } from '@/prototype/ReviewLinks';
import { applyPageEmbed } from '@/prototype/PrototypeFrame';
import { embedUrl } from '../../../prototype/embed.mjs';
import { useSnapshots } from '@/prototype/useSnapshots';
import '@/prototype/prototype.css';

export default function MobilePreviewPage() {
    const [params, setParams] = useVersionParams();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [childContext, setChildContext] = useState<{ version: string; path: string; scenario: string } | null>(null);
    const [width, setWidth] = useState('390');
    const release = releases.find((item) => item.id === params.get('version')) ?? currentRelease;
    const componentMode = params.get('library') === '1' || params.get('page') === 'mobile:mobile-form';
    const diffs = pageDiffs(release);
    const sourcePages = params.get('scope') === 'all' ? productFor(release.id).pages.map((page) => ({ ...page, after: page.path, changes: diffs.find((diff) => diff.key === page.key)?.changes || [] })) : diffs;
    const pages = sourcePages.filter((item) => item.platform === 'mobile' && item.after && (componentMode ? item.pageId === 'mobile-form' : item.pageId !== 'mobile-form'));
    const preset = pages.find((item) => item.key === params.get('page')) ?? pages[0];
    const selected = pages.find((item) => childContext?.version === release.id && item.after === childContext.path) ?? preset;
    const view = params.get('view') === 'page' ? 'page' : 'full';
    const presetScenario = params.get('scenario') || 'normal';
    const scenario = childContext?.version === release.id ? childContext.scenario : presetScenario;
    useEffect(() => {
        function receive(event: MessageEvent<unknown>) {
            if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
            const data = event.data as Record<string, unknown>;
            if (data.type !== 'prototype-mobile-context' || data.version !== release.id || typeof data.path !== 'string' || typeof data.scenario !== 'string' || !['normal', 'empty', 'failure'].includes(data.scenario) || !pages.some((item) => item.after === data.path)) return;
            setChildContext({ version: release.id, path: data.path, scenario: data.scenario });
        }
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [release.id, pages]);
    const snapshots = useSnapshots();
    const target = previewTarget(release, snapshots.data ?? [], currentVersion, siteBase, selected?.after ?? null, selected?.changes[0]?.id, scenario, false);
    const frameTarget = previewTarget(release, snapshots.data ?? [], currentVersion, siteBase, preset?.after ?? null, preset?.changes[0]?.id, presetScenario, false);
    const url = target.url ? new URL(embedUrl(target.url, view), window.location.origin).href : null;
    function update(name: string, value: string) { setChildContext(null); const next = new URLSearchParams(params); next.set(name, value); if (name === 'version') next.delete('page'); else if (name !== 'page' && selected) next.set('page', selected.key); setParams(next); }
    return <div className="proto-page"><header className="proto-heading"><div><div className="proto-eyebrow">MOBILE · VUE + VANT</div><h1>{componentMode ? 'Vant 组件预览' : '手机端产品'}</h1><p className="proto-muted">{release.id} · {target.archived ? '历史快照' : release.id === currentVersion ? '当前构建' : '尚未归档'}</p></div><div className="proto-actions"><label>页面 <select value={selected?.key || ''} onChange={(event) => update('page', event.target.value)}>{pages.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label><label>场景 <select value={scenario} onChange={(event) => update('scenario', event.target.value)}><option value="normal">正常</option><option value="empty">空数据</option><option value="failure">操作失败</option></select></label><label>显示范围 <select value={view} onChange={(event) => update('view', event.target.value)}><option value="full">完整产品</option><option value="page">仅页面</option></select></label><label>设备宽度 <select value={width} onChange={(event) => setWidth(event.target.value)}><option value="375">375 px</option><option value="390">390 px</option><option value="430">430 px</option></select></label>{url && <><a href={url} target="_blank" rel="noreferrer">独立页面 ↗</a><Button onClick={async () => { try { await navigator.clipboard.writeText(url); Toast.success('已复制页面与场景链接'); } catch { Toast.warning('复制失败，请复制独立页面地址'); } }}>复制链接</Button></>}</div></header>
        <ReviewLinks {...(url ? { captureTarget: () => iframeRef.current?.contentDocument?.body || null } : {})} context={{ version: release.id, baseline: release.baseline, change: selected?.changes[0], platform: 'mobile', pageId: selected?.pageId, page: selected?.after || undefined, scenario, pageUrl: url || undefined }} />
        {params.get('version') && params.get('version') !== release.id && <p role="alert">找不到链接请求的版本，当前显示 {release.id}。请重新选择版本。</p>}
        {url ? <><details className="proto-card"><summary>扫码体验 / 分享到手机</summary><div><p className="proto-muted">二维码包含所选版本、页面与场景。跨设备请使用可访问的局域网地址或部署域名。</p></div><QRCodeSVG className="proto-qr" value={url} size={128} title="手机端原型二维码" /></details><div className="proto-phone" style={{ width: Number(width) + 16 }}><iframe ref={iframeRef} src={frameTarget.url ? embedUrl(frameTarget.url, view) : undefined} onLoad={(event) => { if (view === 'page') applyPageEmbed(event.currentTarget); }} title="Vant 手机端原型" /></div></> : <div className="proto-empty">{snapshots.isPending ? '正在检查归档…' : target.reason}，暂不提供手机预览。</div>}
        {snapshots.isError && <p role="alert">历史索引读取失败，请重试。<Button onClick={() => void snapshots.refetch()}>重试</Button></p>}
    </div>;
}
