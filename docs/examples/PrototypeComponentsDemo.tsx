import { DemoParameters, type DemoArgs } from './DemoParameters';
import { prototypeParameterSchemas } from './prototype-parameter-schemas';
import React, { useMemo, useState } from 'react';
import { Button, LocaleProvider, Select } from '@douyinfe/semi-ui';
import zhCN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import { RpScopeSwitch, RpEntry, RpQuickSearch, RpPageReview, createReviewAuthors, createReviewStore, RpPageIdentity, RpPageDirectory, RpUpdatedAt, RpReviewForm, RpVersionOverview, type Release, type ProductPage, type CatalogPage, type SearchPage, type DirectoryPage } from '@weiran-tech/prototype';
import type { PrototypeDemoKey } from './component-catalog';
import './prototype-components.css';
const page = { id: 'sample', title: '本地示例页面', path: '/sample', module: '示例模块', platform: 'manage' as const };
function Example({ component, params = {} }: { component: PrototypeDemoKey; params?: DemoArgs }) {
    const [scope, setScope] = useState<'all' | 'version'>(params.value === 'version' ? 'version' : 'all');
    const [scene, setScene] = useState('normal');
    const [count, setCount] = useState(0);
    const [destination, setDestination] = useState('');
    const configuredRelease = typeof params.release === 'object' && params.release !== null ? params.release : typeof params.version === 'object' && params.version !== null ? params.version : null;
    const release: Release = { ...(configuredRelease as unknown as Release ?? { id: 'v1.1', title: '组件示例', status: 'in_progress', baseline: null, date: '2026-11-26', goal: '使用本地数据验证公共框架', changes: [] }), ...(scene === 'readonly' ? { status: 'completed' as const } : {}) };
    const pages = (Array.isArray(params.pages) ? params.pages : [page]) as unknown as ProductPage[];
    const initialPage = pages.find(item => item.id === params.initialPageId) ?? pages[0];
    const selectedPage = (params.page ?? pages.find(item => item.id === params.initialPageId) ?? page) as unknown as CatalogPage;
    const memory = useMemo(() => {
        const data = new Map<string, string>();
        if (params.notes) data.set('example', JSON.stringify({ notes: { [release.id]: params.notes } }));
        return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); }, clear: () => data.clear(), key: (index: number) => [...data.keys()][index] ?? null, get length() { return data.size; } } satisfies Storage;
    }, []);
    const actions = createReviewStore({ storage: scene === 'failure' ? { ...memory, setItem: () => { throw new Error('模拟存储失败，请切回正常后重试'); } } : memory, storageKey: 'example', releases: () => [release], pagesForReview: () => pages, onChange: () => setCount(value => value + 1) });
    const authors = createReviewAuthors(memory, 'authors', () => actions.readPrototype().notes);
    const show = (key: PrototypeDemoKey) => component === 'all' || component === key;
    const notes = actions.readPrototype().notes[release.id] ?? [];
    return <LocaleProvider locale={zhCN}><div className="prototype-scope prototype-component-demo">
        {component === 'all' && <Select aria-label="演示状态" value={scene} onChange={value => setScene(String(value))} optionList={[{ value: 'normal', label: '正常' }, { value: 'readonly', label: '已完结 / 禁用' }, { value: 'empty', label: '空数据' }, { value: 'failure', label: '存储失败 / 重试' }]} />}
        <div className="prototype-component-demo__stage">
            {show('scope-switch') && <div style={{ width: 240 }}><RpScopeSwitch value={scope} onChange={setScope} /><p>当前范围：{scope === 'all' ? '全部产品' : '版本改动'}</p></div>}
            {show('entry') && <div className="prototype-component-demo__entries">{(params.kind ? [params.kind as 'manage' | 'mobile' | 'changes'] : ['manage', 'mobile', 'changes'] as const).map(kind => <RpEntry key={kind} kind={kind} to={params.to as string ?? `/example/${kind}`} onNavigate={setDestination}>{params.children as string ?? (kind === 'manage' ? '访问管理端' : kind === 'mobile' ? '访问手机端' : '查看版本改动')}</RpEntry>)}</div>}
            {show('page-identity') && <RpPageIdentity release={release} page={selectedPage} path={params.path as string ?? "/sample"} platform={params.platform === 'mobile' ? 'mobile' : 'manage'} />}
            {show('quick-search') && <RpQuickSearch pages={scene === 'empty' ? [] : (params.pages as unknown as SearchPage[] ?? [{ ...page, keywords: '示例 demo 页面' }])} locked={Boolean(params.locked) || scene === 'readonly'} onNavigate={setDestination} />}
            {show('version-overview') && <RpVersionOverview baseline={params.baseline as string ?? <strong>初始基线</strong>} date={params.date as string ?? release.date} pages={scene === 'empty' ? 0 : typeof params.pages === 'number' ? params.pages : 1} changes={params.changes as number ?? 0} />}
            {show('page-directory') && <RpPageDirectory version={typeof params.version === 'string' ? params.version : release.id} full={params.full === undefined ? scope === 'all' : Boolean(params.full)} scopeControls={<div style={{ width: 200 }}><RpScopeSwitch value={scope} onChange={setScope} /></div>} pages={scene === 'empty' ? [] : (params.pages as unknown as DirectoryPage[] ?? [{ ...page, changes: [], unavailable: '本地演示不连接业务服务' }])} />}
            {show('review-form') && <RpReviewForm key={scene} version={release} pages={scene === 'empty' ? [] : pages} actions={actions} authorsStore={authors} {...(scene === 'empty' || !initialPage ? {} : { initialPage })} />}
            {show('page-review') && <RpPageReview release={release} page={{ ...selectedPage, files: selectedPage.files ?? [] }} pages={scene === 'empty' ? [] : pages} notes={notes} actions={actions} authorsStore={authors} locked={Boolean(params.locked)} reviewPath={params.reviewPath as string ?? "#demo-review-records"} />}
            {show('updated-at') && <RpUpdatedAt updatedAt={params.updatedAt as string ?? "2026-11-26T12:00:00+08:00"} timeZone={params.timeZone as string ?? "Asia/Shanghai"} />}
        </div>
        <p aria-live="polite">{destination ? `示例导航目标：${destination}（演示不离开文档）` : `已保存 ${notes.length} 条本机示例记录`}</p>
        {show('quick-search') && scene === 'readonly' && <p>锁定状态下搜索入口隐藏。</p>}
        <Button onClick={() => { memory.clear(); setCount(count + 1); setDestination(''); }}>重置示例数据</Button>
        <div id="demo-review-records" aria-label="示例评审记录">{notes.map(note => <p key={note.id}>{note.author}：{note.text}</p>)}</div>
    </div></LocaleProvider>;
}
export function PrototypeComponentsDemo({ component = 'all' }: { component?: PrototypeDemoKey }) {
    if (component === 'all') return <Example component={component} />;
    return <DemoParameters key={component} name={component} schema={prototypeParameterSchemas[component]}>{args => <Example component={component} params={args} />}</DemoParameters>;
}
