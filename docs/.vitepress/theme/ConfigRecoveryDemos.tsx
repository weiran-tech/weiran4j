import React, { useEffect, useRef, useState } from 'react';
import { Button, Empty, SideSheet } from '@douyinfe/semi-ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queriesReady, QueryReadiness } from '../../../packages/manage/src/components/QueryReadiness';
import { SystemConfigGroupForm } from '../../../packages/manage/src/components/SystemConfigGroupForm';
import { useDraftCloseGuard } from '../../../packages/manage/src/hooks/useFormCloseGuard';
import { LoginMethodsFields } from '../../../packages/manage/src/pages/system/security/LoginMethodsSettings';
import type { ConfigView } from '../../../packages/manage/src/types/api';

const records: ConfigView[] = [{ id: 42, configKey: 'system.general.note', configValue: '本地演示说明', configType: 'string', groupKey: 'general', fieldType: 'input', fieldOptions: null, required: true, description: '说明文字', isBuiltin: true, createdAt: '', updatedAt: '' }];
type Mode = 'success' | 'loading' | 'error' | 'cached-error' | 'empty' | 'retrying';
const modes: Record<Mode, string> = { success: '读取成功', loading: '首次加载中', error: '首次读取失败', 'cached-error': '缓存刷新失败', empty: '成功空数据', retrying: '重试中' };
const labels = ['配置分组', '配置项'];

export function ConfigFeedbackDemo() {
    const [client] = useState(() => new QueryClient());
    const [states, setStates] = useState<Mode[]>(['success', 'success']);
    const [loaded, setLoaded] = useState([true, true]);
    const [message, setMessage] = useState('本地演示，不发送业务请求。');
    const retry = (index: number) => setStates(old => old.map((mode, i) => i === index ? 'retrying' : mode));
    useEffect(() => {
        if (!states.includes('retrying')) return;
        const timer = setTimeout(() => {
            setLoaded(old => old.map((value, i) => states[i] === 'retrying' || value));
            setStates(old => old.map(mode => mode === 'retrying' ? 'success' : mode));
        }, 600);
        return () => clearTimeout(timer);
    }, [states]);
    const queries = states.map((mode, i) => ({ data: mode === 'empty' ? [] : mode === 'success' || mode === 'cached-error' || (mode === 'retrying' && loaded[i]) ? records : undefined, isSuccess: mode === 'success' || mode === 'empty', isError: mode === 'error' || mode === 'cached-error', isFetching: mode === 'loading' || mode === 'retrying' }));
    const ready = queriesReady(...queries);
    const empty = queries.every(query => query.isSuccess) && queries.some(query => query.data?.length === 0);
    return <QueryClientProvider client={client}>
        <div className="page-state-demo__controls">{labels.map((label, index) => <label key={label}>{label}读取状态<select aria-label={`${label}读取状态`} value={states[index]} onChange={event => {
            const mode = event.target.value as Mode;
            setStates(old => old.map((value, i) => i === index ? mode : value));
            setLoaded(old => old.map((value, i) => i === index ? mode === 'success' || mode === 'cached-error' : value));
        }}>{Object.entries(modes).map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}</select></label>)}</div>
        <section className="page-state-demo__preview" aria-label="配置读取恢复预览">
            {queries.map((query, index) => <QueryReadiness key={index} query={query} label={labels[index]!} onRetry={() => retry(index)} />)}
            {empty ? <Empty title="暂无配置项" /> : queries.every(query => query.data?.length) ? <SystemConfigGroupForm records={records} canEdit disabled={!ready} showSettings={false} onEdit={() => undefined}
                successMessage="本地演示已保存" onSave={async () => { await new Promise(resolve => setTimeout(resolve, 500)); setMessage('草稿已保存到本地演示状态，不写入数据库。'); }} /> : null}
            <p role="status">{message}</p>
        </section>
    </QueryClientProvider>;
}

export function SecurityDrawerDemo() {
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [saved, setSaved] = useState(false);
    const [initial, setInitial] = useState({ enabled: false });
    const [result, setResult] = useState('success');
    const [message, setMessage] = useState('草稿仅存在内存中，不发送业务请求。');
    const finish = useRef<(() => void) | null>(null);
    useEffect(() => () => finish.current?.(), []);
    const guard = useDraftCloseGuard({ enabled }, initial, () => setOpen(false));
    const save = async () => {
        if (result === 'delay') await new Promise<void>(resolve => { finish.current = resolve; });
        if (result === 'error') { setMessage('保存失败，草稿已保留，请重试。'); return; }
        setSaved(enabled); setOpen(false); setMessage('本地演示已保存。');
    };
    return <section className="page-state-demo__preview">
        <label>抽屉保存结果<select aria-label="抽屉保存结果" value={result} disabled={guard.saving} onChange={event => setResult(event.target.value)}><option value="success">保存成功</option><option value="error">保存失败</option><option value="delay">延迟完成</option></select></label>
        <Button onClick={() => { setEnabled(saved); setInitial({ enabled: saved }); setOpen(true); }}>编辑登录方式演示</Button>
        <SideSheet visible={open} title="登录方式关闭保护演示" width={560} onCancel={guard.requestClose} closable={!guard.saving} closeOnEsc={!guard.saving} maskClosable={false}
            footer={<div className="security-settings__footer"><Button disabled={guard.saving} onClick={guard.requestClose}>取消</Button><Button type="primary" theme="solid" disabled={guard.saving} loading={guard.saving} onClick={() => void guard.submit(save).catch(() => undefined)}>保存</Button></div>}>
            <LoginMethodsFields enabled={enabled} disabled={guard.saving} onChange={setEnabled} />
            {guard.saving && result === 'delay' && <Button onClick={() => finish.current?.()}>完成模拟保存</Button>}
            <p role="status">{message}</p>
        </SideSheet>
        <p role="status">{message}</p>
    </section>;
}
