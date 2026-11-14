import React, { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Input, Space } from '@douyinfe/semi-ui';
import { SearchToolbar } from '../../../packages/manage/src/components/SearchToolbar';
import { useDebouncedCallback, useSingleFlightCallback } from '../../../packages/manage/src/hooks/useActionGuard';

export function ActionGuardDemo() {
    const [draft, setDraft] = useState('演示条件');
    const [applied, setApplied] = useState('');
    const [searches, setSearches] = useState(0);
    const [submits, setSubmits] = useState(0);
    const [refreshes, setRefreshes] = useState(0);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fail, setFail] = useState(false);
    const [message, setMessage] = useState('');
    const timers = useRef(new Map<ReturnType<typeof setTimeout>, () => void>());
    useEffect(() => {
        const pending = timers.current;
        return () => { pending.forEach((resolve, timer) => { clearTimeout(timer); resolve(); }); };
    }, []);
    const delay = () => new Promise<void>((resolve) => {
        const timer = setTimeout(() => { timers.current.delete(timer); resolve(); }, 800);
        timers.current.set(timer, resolve);
    });
    const { schedule: search, cancel: cancelSearch } = useDebouncedCallback(() => { setApplied(draft); setSearches((n) => n + 1); });
    const submit = useSingleFlightCallback(async () => {
        setSaving(true);
        setSubmits((n) => n + 1);
        setMessage('提交中');
        try {
            await delay();
            setMessage(fail ? '提交失败，输入保留，可以手动重试。' : '提交成功');
        } finally { setSaving(false); }
    });
    const refresh = async () => {
        setRefreshing(true);
        setRefreshes((n) => n + 1);
        try { await delay(); } finally { setRefreshing(false); }
    };
    return <section className="page-state-demo__preview" aria-label="操作防抖演示">
        <SearchToolbar onSearch={search} onReset={() => { cancelSearch(); setDraft(''); setApplied(''); }} onRefresh={refresh} refreshing={refreshing}>
            <Input aria-label="防抖搜索条件" value={draft} onChange={setDraft} onEnterPress={search} />
        </SearchToolbar>
        <Space wrap><Button loading={saving} disabled={saving} onClick={() => void submit()}>提交演示表单</Button><Checkbox checked={fail} onChange={(e) => setFail(e.target.checked ?? false)}>模拟提交失败</Checkbox></Space>
        <p role="status">提交 {submits} 次 · 刷新 {refreshes} 次 · 搜索 {searches} 次 · 生效条件：{applied || '无'} · {message}</p>
    </section>;
}
