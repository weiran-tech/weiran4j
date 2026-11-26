import React, { useMemo, useState } from 'react';
import { Button, LocaleProvider, Select } from '@douyinfe/semi-ui';
import zhCN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import { createReviewAuthors, createReviewStore, PageIdentity, PrototypePageDirectory, PrototypeUpdatedAt, ReviewForm, VersionOverview, type Release } from '@weiran-tech/prototype';
import '@weiran-tech/prototype/style.css';
const page = { id: 'sample', title: '本地示例页面', path: '/sample', module: '示例模块', platform: 'manage' as const };
function Example() {
    const [scene, setScene] = useState('normal');
    const [count, setCount] = useState(0);
    const release: Release = { id: 'v1.1', title: '组件示例', status: scene === 'readonly' ? 'completed' : 'in_progress', baseline: null, date: '2026-11-26', goal: '使用本地数据验证公共框架', changes: [] };
    const memory = useMemo(() => {
        const data = new Map<string, string>();
        return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); }, clear: () => data.clear(), key: (index: number) => [...data.keys()][index] ?? null, get length() { return data.size; } } satisfies Storage;
    }, []);
    const actions = createReviewStore({ storage: scene === 'failure' ? { ...memory, setItem: () => { throw new Error('模拟存储失败，请切回正常后重试'); } } : memory, storageKey: 'example', releases: () => [release], pagesForReview: () => [page], onChange: () => setCount(count + 1) });
    const authors = createReviewAuthors(memory, 'authors', () => actions.readPrototype().notes);
    return <LocaleProvider locale={zhCN}><div className="prototype-scope" style={{ padding: 20 }}>
        <Select aria-label="演示状态" value={scene} onChange={value => setScene(String(value))} optionList={[{ value: 'normal', label: '正常' }, { value: 'readonly', label: '已完结 / 禁用' }, { value: 'empty', label: '空目录' }, { value: 'failure', label: '存储失败 / 重试' }]} />
        <PageIdentity release={release} page={page} path="/sample" platform="manage" />
        <VersionOverview baseline={<strong>初始基线</strong>} date={release.date} pages={1} changes={0} />
        <PrototypePageDirectory version={release.id} full pages={scene === 'empty' ? [] : [{ ...page, changes: [], unavailable: '本地演示不连接业务服务' }]} />
        <ReviewForm key={scene} version={release} pages={[page]} actions={actions} authorsStore={authors} initialPage={page} />
        <p aria-live="polite">已保存 {actions.readPrototype().notes[release.id]?.length ?? 0} 条本机示例记录</p>
        <Button onClick={() => { memory.clear(); setCount(count + 1); }}>重置示例数据</Button>
        <PrototypeUpdatedAt updatedAt="2026-11-26T12:00:00+08:00" />
    </div></LocaleProvider>;
}
export function PrototypeComponentsDemo() { return <Example />; }
