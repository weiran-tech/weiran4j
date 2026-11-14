import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, Modal, Space, Table } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useFormCloseGuard } from '../../../packages/manage/src/hooks/useFormCloseGuard';
import { ListEmptyState, ListFeedback } from '../../../packages/manage/src/components/ListFeedback';
import { OperationLogDetails } from '../../../packages/manage/src/components/OperationLogDetails';
import type { OperationLogView } from '../../../packages/manage/src/types/api';

type Mode = 'success' | 'loading' | 'empty' | 'error' | 'cached-error' | 'retrying';
const modes: Record<Mode, string> = { success: '读取成功', loading: '首次加载中', empty: '空数据', error: '首次读取失败', 'cached-error': '缓存刷新失败', retrying: '正在重试' };
const log: OperationLogView = { id: 42, userId: 1, username: '演示管理员', module: '用户', description: '修改示例用户', method: 'PUT', path: '/example/users/2', success: true, responseCode: 0, durationMs: 12, ip: '127.0.0.1', userAgent: 'Docs Demo', createdAt: '2026-11-14 10:00:00', requestBody: '{"nickname":"示例用户"}', errorMessage: null };

export function ReadRecoveryDemo({ detail = false }: { detail?: boolean }) {
    const [mode, setMode] = useState<Mode>('success');
    const [kind, setKind] = useState('角色');
    const [filtered, setFiltered] = useState(false);
    const [keyword, setKeyword] = useState('');
    useEffect(() => {
        if (mode !== 'retrying') return;
        const timer = setTimeout(() => setMode('success'), 600);
        return () => clearTimeout(timer);
    }, [mode]);
    const isError = mode === 'error' || mode === 'cached-error';
    const isFetching = mode === 'loading' || mode === 'retrying';
    const hasData = mode === 'success' || mode === 'cached-error';
    return <>
        <div className="page-state-demo__controls">
            {!detail && <label>列表示例<select aria-label="列表示例" value={kind} onChange={(e) => setKind(e.target.value)}>{['角色', '菜单', '字典', '字典项', '登录日志', '操作日志'].map((name) => <option key={name}>{name}</option>)}</select></label>}
            <label>读取状态<select aria-label="读取状态" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>{Object.entries(modes).filter(([key]) => key !== 'retrying' && (!detail || key !== 'empty')).map(([key, label]) => <option key={key} value={key}>{label}</option>)}{mode === 'retrying' && <option value="retrying">正在重试</option>}</select></label>
        </div>
        <section className="page-state-demo__preview" aria-label={detail ? '日志详情预览' : '列表反馈预览'}>
            {detail ? <OperationLogDetails query={{ data: hasData ? log : undefined, isSuccess: mode === 'success', isError, isFetching }} onRetry={() => setMode('retrying')} /> : <>
                <h3>{kind}列表</h3>
                <Space wrap><Button onClick={() => { setFiltered(true); setKeyword('示例条件'); setMode('empty'); }}>模拟筛选无结果</Button><Button loading={isFetching} onClick={() => setMode('retrying')}>刷新</Button></Space>
                <p>已生效条件：{keyword || '无'} · 第 1 页</p>
                {isError && <ListFeedback hasData={hasData} retrying={isFetching} onRetry={() => setMode('retrying')} />}
                <Table rowKey="id" size="small" columns={[{ title: 'ID', dataIndex: 'id', width: 80 }, { title: '名称', dataIndex: 'name' }]} dataSource={hasData ? [{ id: 42, name: `${kind}示例记录` }] : []} loading={isFetching} pagination={false}
                    empty={isFetching || isError ? <span aria-hidden="true" /> : <ListEmptyState filtered={filtered} onReset={() => { setFiltered(false); setKeyword(''); setMode('success'); }} />} />
            </>}
        </section>
    </>;
}

function ProtectedDemoForm({ onClose }: { onClose: () => void }) {
    const api = useRef<FormApi<{ name: string }> | null>(null);
    const guard = useFormCloseGuard(api, onClose);
    const [result, setResult] = useState('success');
    const [message, setMessage] = useState('');
    const finish = useRef<(() => void) | null>(null);
    useEffect(() => () => { finish.current?.(); }, []);
    const save = async () => {
        const values = await api.current?.validate();
        if (!values) return;
        if (result === 'delay') await new Promise<void>((resolve) => { finish.current = resolve; });
        if (result === 'error') { setMessage('保存失败，草稿已保留，可以重试。'); return; }
        onClose();
    };
    return <Modal visible title="编辑保护演示" onCancel={guard.requestClose} onOk={() => void guard.submit(save).catch(() => undefined)}
        okButtonProps={{ loading: guard.saving, disabled: guard.saving }} cancelButtonProps={{ disabled: guard.saving }} closable={!guard.saving} closeOnEsc={!guard.saving} maskClosable={false}>
        <Form<{ name: string }> initValues={{ name: '示例名称' }} getFormApi={(form) => { api.current = form; }}><Form.Input field="name" label="名称" rules={[{ required: true, message: '请输入名称' }]} /></Form>
        <label>保存结果<select aria-label="保存结果" value={result} disabled={guard.saving} onChange={(e) => { setResult(e.target.value); setMessage(''); }}><option value="success">保存成功</option><option value="error">保存失败</option><option value="delay">延迟完成</option></select></label>
        {guard.saving && result === 'delay' && <Button onClick={() => finish.current?.()}>完成模拟保存</Button>}
        <p role="status">{message || (guard.saving ? '保存中，关闭与重复提交已禁用。' : '修改名称后尝试取消、关闭或 Esc。')}</p>
    </Modal>;
}

export function FormProtectionDemo() {
    const [open, setOpen] = useState(false);
    return <section className="page-state-demo__preview"><p>角色、菜单、字典和字典项复用相同的关闭与提交保护。此演示使用实际 useFormCloseGuard 和 Semi Form，草稿仅存在内存中。</p>
        <Button theme="solid" type="primary" onClick={() => setOpen(true)}>打开编辑演示</Button>
        {open && <ProtectedDemoForm onClose={() => setOpen(false)} />}
    </section>;
}
