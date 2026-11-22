import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Space, Table } from '@douyinfe/semi-ui';
import { ListEmptyState, ListFeedback } from '../../../packages/manage/src/components/ListFeedback';
import { QueryReadiness } from '../../../packages/manage/src/components/QueryReadiness';
import { SearchToolbar } from '../../../packages/manage/src/components/SearchToolbar';
import { useActionsColumn } from '../../../packages/manage/src/components/TableActions';
import { mediaLibraryColumns } from '../../../packages/manage/src/pages/system/media-library';
import { tableScrollX } from '../../../packages/manage/src/hooks/useTableDefaults';
import type { SystemMediaFileView } from '../../../packages/manage/src/types/api';

type Mode = 'success' | 'empty' | 'loading' | 'error' | 'cached-error' | 'retrying';
const modes: Record<Mode, string> = { success: '读取成功', empty: '空数据', loading: '加载中', error: '首次失败', 'cached-error': '缓存刷新失败', retrying: '重试中' };
const record: SystemMediaFileView = { id: Number.MAX_SAFE_INTEGER, originalName: '季度报告_用于检查长文件名省略与表格列宽的示例.pdf', url: '/example.pdf', category: 'document', size: 9876543, createdAt: '2026-11-22 23:59:59', references: ['系统配置：报告文件'] };

export function MediaLibraryStyleDemo() {
    const [mode, setMode] = useState<Mode>('success');
    const [keyword, setKeyword] = useState('');
    const [applied, setApplied] = useState('');
    const [uploadReady, setUploadReady] = useState(true);
    const [canEdit, setCanEdit] = useState(true);
    const [notice, setNotice] = useState('示例不连接业务接口、不上传或删除文件。');
    useEffect(() => {
        if (mode !== 'retrying') return;
        const timer = setTimeout(() => setMode('success'), 600);
        return () => clearTimeout(timer);
    }, [mode]);
    const hasData = mode === 'success' || mode === 'cached-error';
    const failed = mode === 'error' || mode === 'cached-error';
    const loading = mode === 'loading' || mode === 'retrying';
    const reset = () => { setKeyword(''); setApplied(''); setMode('success'); };
    const { columns } = useActionsColumn(mediaLibraryColumns(), () => [
        { key: 'preview', label: '预览', onClick: () => setNotice('已点击预览（本地演示）。') },
        { key: 'copy', label: '复制链接', onClick: () => setNotice('已点击复制链接（本地演示）。') },
        ...(canEdit ? [{ key: 'delete', label: '删除', danger: true, disabled: true, onClick: () => undefined }] : []),
    ]);
    return <>
        <div className="page-state-demo__controls">
            <label>资源读取状态<select aria-label="资源读取状态" value={mode} onChange={event => setMode(event.target.value as Mode)}>
                {Object.entries(modes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <Space wrap>
                <Checkbox checked={uploadReady} onChange={event => setUploadReady(event.target.checked ?? false)}>上传配置可用</Checkbox>
                <Checkbox checked={canEdit} onChange={event => setCanEdit(event.target.checked ?? false)}>允许上传和删除</Checkbox>
            </Space>
        </div>
        <section className="page-state-demo__preview" aria-label="资源列表风格预览">
            <SearchToolbar
                leading={<Button type="primary" theme="solid" disabled={!uploadReady || !canEdit} onClick={() => setNotice('此处仅演示上传入口，不发送文件。')}>上传文件</Button>}
                onSearch={() => { setApplied(keyword); setMode(keyword && !record.originalName.includes(keyword) ? 'empty' : 'success'); }}
                onReset={reset} onRefresh={() => setMode('retrying')} refreshing={loading}
            ><Input style={{ width: 210 }} placeholder="按文件名搜索" value={keyword} onChange={setKeyword} /></SearchToolbar>
            <QueryReadiness query={{ data: uploadReady ? {} : undefined, isSuccess: uploadReady, isError: !uploadReady, isFetching: false }} label="上传配置" onRetry={() => setUploadReady(true)} />
            {failed && <ListFeedback hasData={hasData} retrying={loading} onRetry={() => setMode('retrying')} />}
            <Table rowKey="id" size="small" columns={columns} dataSource={hasData ? [record] : []} loading={loading} pagination={false} scroll={{ x: tableScrollX(columns, 180) }}
                empty={loading || failed ? <span aria-hidden="true" /> : <ListEmptyState filtered={Boolean(applied)} onReset={reset} />} />
            <p role="status">{notice}</p>
        </section>
    </>;
}
