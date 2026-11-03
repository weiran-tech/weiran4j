import { Button, Progress, Select, Spin, Steps, Table, Toast, Typography } from '@douyinfe/semi-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ComponentType } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BatchJobView, BatchTaskDetailView, PageResult } from '@/types/api';
import { http } from '@/utils/request';
import './BatchJobWorkbench.css';

export type BatchPageResult<T> = PageResult<T>;
export type BatchJob = BatchJobView;
export interface BatchKindOption { value: string; label: string; accept: string }
export interface BatchSample { label: string; href: string }
export interface BatchJobWorkbenchProps {
    title: string;
    description: string;
    kinds: BatchKindOption[];
    samples?: BatchSample[];
    sampleHint?: string;
    uploadHint?: string;
    ResultPanel?: ComponentType<{ job: BatchJob }>;
}

const ACTIVE = new Set(['queued', 'running', 'cancel_requested']);
const STATUS: Record<string, string> = {
    queued: '排队中', running: '处理中', cancel_requested: '正在取消',
    succeeded: '完成', partial_failed: '部分失败', failed: '失败', cancelled: '已取消',
};
const PHASE_STEP: Record<string, number> = {
    waiting: 0, uploading: 0, preparing: 0, validating: 1, deciding: 2, processing: 3, summarizing: 4, finished: 4,
};
const PHASE_LABEL: Record<string, string> = {
    waiting: '排队等待', uploading: '上传完成', preparing: '准备输入', validating: '逐项预检',
    deciding: '自动决策', processing: '逐项入库', summarizing: '汇总结果', finished: '处理结束',
};

function stepStatus(status: string): 'process' | 'finish' | 'error' | 'warning' {
    if (status === 'failed') return 'error';
    if (status === 'cancelled' || status === 'partial_failed') return 'warning';
    return status === 'succeeded' ? 'finish' : 'process';
}

function stageStatus(step: number, job: BatchJob | undefined): 'wait' | 'process' | 'finish' | 'error' | 'warning' {
    if (!job) return step === 0 ? 'process' : 'wait';
    const reached = PHASE_STEP[job.phase] ?? 0;
    if (step < reached) return 'finish';
    if (step > reached) return 'wait';
    return stepStatus(job.status);
}

function BatchDetailTable({ data, loading, page, onPageChange }: {
    data: BatchPageResult<BatchTaskDetailView> | undefined; loading: boolean; page: number; onPageChange: (page: number) => void;
}) {
    const { tableProps } = useTableDefaults();
    const columns = [
        { title: 'ID', dataIndex: 'id', width: 90 },
        { title: '序号', dataIndex: 'itemNo', width: 90 },
        { title: '处理项', dataIndex: 'itemName', width: 180 },
        { title: '源位置', dataIndex: 'sourceLocation', width: 190 },
        { title: '结果', dataIndex: 'status', width: 90, render: (value: string) => value === 'succeeded' ? '通过' : value === 'pending' ? '待处理' : '失败' },
        { title: '原因', dataIndex: 'message' },
    ];
    return <Table<BatchTaskDetailView> {...tableProps} rowKey="id" dataSource={data?.list ?? []} loading={loading}
        columns={columns} scroll={{ x: `max(100%, ${tableScrollX(columns)}px)` }} pagination={{ currentPage: page, pageSize: 20, total: data?.total ?? 0,
        showTotal: true, onChange: (nextPage) => onPageChange(nextPage) }} />;
}

export function BatchJobWorkbench({ title, description, kinds, samples = [], sampleHint, uploadHint, ResultPanel }: BatchJobWorkbenchProps) {
    const client = useQueryClient();
    const stageRef = useRef<HTMLElement>(null);
    const { hasPermission } = usePermission();
    const { tableProps } = useTableDefaults();
    const [kind, setKind] = useState(kinds[0]?.value ?? '');
    const [file, setFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedStep, setSelectedStep] = useState<number | null>(null);
    const [detailStatus, setDetailStatus] = useState('all');
    const [detailPage, setDetailPage] = useState(1);
    const kindFilter = kinds.map((option) => option.value).join(',');
    const list = useQuery({
        queryKey: ['batch-jobs', kindFilter],
        queryFn: () => http.get<BatchJob[]>(`/api-backend/system/batchJob/list?kinds=${encodeURIComponent(kindFilter)}`),
        enabled: kinds.length > 0,
        refetchInterval: 3000,
    });
    const detail = useQuery({
        queryKey: ['batch-job', selectedId],
        queryFn: () => http.get<BatchJob>(`/api-backend/system/batchJob/get/${selectedId}`),
        enabled: selectedId !== null,
        refetchInterval: (query) => ACTIVE.has(query.state.data?.status ?? 'queued') ? 1500 : false,
    });
    const job = detail.data ?? list.data?.find((entry) => entry.id === selectedId);
    const activeStep = selectedStep ?? (PHASE_STEP[job?.phase ?? 'waiting'] ?? 0);
    const taskDetails = useQuery({
        queryKey: ['batch-task-details', selectedId, activeStep, detailStatus, detailPage, detail.data?.processed, detail.data?.status],
        queryFn: () => {
            const params = new URLSearchParams({ page: String(detailPage), pageSize: '20', stage: activeStep === 1 ? 'validating' : 'processing' });
            if (detailStatus !== 'all') params.set('status', detailStatus);
            return http.get<BatchPageResult<BatchTaskDetailView>>(`/api-backend/system/batchJob/listDetails/${selectedId}?${params}`);
        },
        enabled: selectedId !== null && (activeStep === 1 || activeStep === 3),
        refetchInterval: detail.data && ACTIVE.has(detail.data.status) ? 2000 : false,
    });
    const create = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error('请选择文件');
            const body = new FormData();
            body.append('kind', kind);
            body.append('file', file);
            return http.post<BatchJob>('/api-backend/system/batchJob/create', body);
        },
        onSuccess: (job) => {
            setSelectedId(job.id);
            setSelectedStep(null);
            setDetailPage(1);
            setFile(null);
            setFileInputKey((value) => value + 1);
            void client.invalidateQueries({ queryKey: ['batch-jobs', kindFilter] });
            Toast.success(`任务 #${job.id} 已创建`);
        },
    });
    const cancel = useMutation({
        mutationFn: (id: number) => http.post<BatchJob>(`/api-backend/system/batchJob/cancel/${id}`),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ['batch-jobs'] });
            void client.invalidateQueries({ queryKey: ['batch-job', selectedId] });
        },
    });
    const percent = job?.total ? Math.min(100, Math.round(job.processed * 100 / job.total)) : 0;
    const jobColumns = [
        { title: 'ID', dataIndex: 'id', width: 100 },
        { title: '文件', dataIndex: 'sourceName' },
        { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => STATUS[value] ?? value },
        { title: '进度', dataIndex: 'processed', width: 140, render: (_: number, row: BatchJob) => `${row.processed} / ${row.total ?? '扫描中'}` },
        { title: '操作', dataIndex: 'actions', width: 90, fixed: 'right' as const, render: (_: unknown, row: BatchJob) => <Button size="small" onClick={() => { setSelectedId(row.id); setSelectedStep(null); setDetailPage(1); stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>查看</Button> },
    ];

    return (
        <PageContainer title={title} extra={<span className="batch-workbench__hint">{description}</span>}>
            <div className="batch-workbench">
                <section ref={stageRef} className="batch-workbench__panel">
                    <div className="batch-workbench__heading">
                        <strong>{job ? `任务 #${job.id} · ${STATUS[job.status] ?? job.status}` : '新建批处理任务'}</strong>
                        {job && ACTIVE.has(job.status) && hasPermission('system:batch-job:cancel') &&
                            <Button loading={cancel.isPending} onClick={() => cancel.mutate(job.id)}>取消任务</Button>}
                    </div>
                    {job && <p>{job.sourceName} · 当前阶段：{PHASE_LABEL[job.phase] ?? job.phase}</p>}
                    <div className="batch-workbench__steps">
                        <Steps type="basic" current={activeStep} size="small"
                                aria-label="任务处理阶段" style={{ minWidth: 620 }} onChange={(step) => { setSelectedStep(step); setDetailStatus('all'); setDetailPage(1); }}>
                            <Steps.Step title="上传" status={stageStatus(0, job)} />
                            <Steps.Step title="预检" status={stageStatus(1, job)} />
                            <Steps.Step title="决策" status={stageStatus(2, job)} />
                            <Steps.Step title="入库" status={stageStatus(3, job)} />
                            <Steps.Step title="总结" status={stageStatus(4, job)} />
                        </Steps>
                    </div>
                    {activeStep === 0 && <div className="batch-workbench__content">
                        <strong>上传文件</strong>
                        {samples.length > 0 && <div className="batch-workbench__upload">
                            {samples.map((sample) => <a key={sample.href} href={sample.href}>{sample.label}</a>)}
                        </div>}
                        {sampleHint && <p className="batch-workbench__hint">{sampleHint}</p>}
                        <div className="batch-workbench__upload">
                            <Select value={kind} onChange={(value) => { setKind(String(value)); setFile(null); }} style={{ width: 180 }}
                                optionList={kinds.map((option) => ({ label: option.label, value: option.value }))} />
                            <input aria-label="选择批处理文件" type="file" accept={kinds.find((option) => option.value === kind)?.accept}
                                key={`${kind}-${fileInputKey}`} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                            <Button type="primary" theme="solid" loading={create.isPending} disabled={!kind || !file || !hasPermission('system:batch-job:create')}
                                onClick={() => void create.mutateAsync().catch(() => undefined)}>上传并开始处理</Button>
                        </div>
                        {file && <p>已选择：{file.name}</p>}
                        {uploadHint && <p className="batch-workbench__hint">{uploadHint}</p>}
                        {job && <p>任务 #{job.id} 已创建 · 文件：{job.sourceName} · 创建时间：{job.createdAt}</p>}
                    </div>}
                    {activeStep === 1 && <div className="batch-workbench__content">
                        {job ? <>
                            <div className="batch-workbench__heading">
                                <strong>逐项预检结果</strong>
                                <Select value={detailStatus} style={{ width: 130 }} optionList={[
                                    { label: '全部', value: 'all' }, { label: '通过', value: 'succeeded' }, { label: '失败', value: 'failed' },
                                ]} onChange={(value) => { setDetailStatus(String(value)); setDetailPage(1); }} />
                            </div>
                            {job.phase === 'validating' && ACTIVE.has(job.status) && <p>正在扫描完整输入…</p>}
                            <p>已识别 {job.total ?? '扫描中'} 项；预检失败项计入最终失败数。</p>
                            <BatchDetailTable data={taskDetails.data} loading={taskDetails.isPending} page={detailPage} onPageChange={setDetailPage} />
                            {taskDetails.isError && <Typography.Text type="danger">预检明细读取失败，请刷新页面重试。</Typography.Text>}
                        </> : <p>请先在「上传与排队」阶段上传文件。</p>}
                    </div>}
                    {activeStep === 2 && <div className="batch-workbench__content">
                        {job ? <>
                            <strong>自动决策</strong>
                            <p>总计 {job.total ?? '待预检'} 项，选中入库 {job.selectedCount ?? '待决策'} 项，预检失败 {job.failed} 项。</p>
                            {job.phase === 'deciding' && <p>正在持久化入库选择…</p>}
                            {job.errorMessage && <Typography.Text type="danger">{job.errorMessage}</Typography.Text>}
                        </> : <p>请先在「上传与排队」阶段上传文件。</p>}
                    </div>}
                    {activeStep === 3 && <div className="batch-workbench__content">
                        {job ? <>
                            <div className="batch-workbench__heading">
                                <strong>逐项入库结果</strong>
                                <Select value={detailStatus} style={{ width: 130 }} optionList={[
                                    { label: '全部', value: 'all' }, { label: '待处理', value: 'pending' },
                                    { label: '成功', value: 'succeeded' }, { label: '失败', value: 'failed' },
                                ]} onChange={(value) => { setDetailStatus(String(value)); setDetailPage(1); }} />
                            </div>
                            {(PHASE_STEP[job.phase] ?? 0) < 3 && <p>任务尚未进入逐项处理阶段。</p>}
                            {job.total === null ? (ACTIVE.has(job.status) ? <Spin /> : null) : <Progress percent={percent} />}
                            <p>已处理 {job.processed} / {job.total ?? '待确定'} · 成功 {job.succeeded} · 失败 {job.failed}</p>
                            <BatchDetailTable data={taskDetails.data} loading={taskDetails.isPending} page={detailPage} onPageChange={setDetailPage} />
                            {taskDetails.isError && <Typography.Text type="danger">处理明细读取失败，请刷新页面重试。</Typography.Text>}
                        </> : <p>请先在「上传与排队」阶段上传文件。</p>}
                    </div>}
                    {activeStep === 4 && <div className="batch-workbench__content">
                        {!job ? <p>请先在「上传与排队」阶段上传文件。</p> : ACTIVE.has(job.status) ?
                            <p>任务尚未结束，完成后在这里查看已导入的数据。</p> : <>
                                <strong>处理结果：{STATUS[job.status] ?? job.status}</strong>
                                <p>总计 {job.total ?? '未确定'} · 已处理 {job.processed} · 成功 {job.succeeded} · 失败 {job.failed}</p>
                                {job.errorMessage && <Typography.Text type="danger">{job.errorMessage}</Typography.Text>}
                                {ResultPanel && <ResultPanel job={job} />}
                            </>}
                    </div>}
                </section>

                <section className="batch-workbench__panel">
                    <strong>最近任务</strong>
                    {list.isPending ? <Spin /> : list.isError ? <Typography.Text type="danger">任务读取失败</Typography.Text> : (
                        <Table<BatchJob> {...tableProps} rowKey="id" dataSource={list.data ?? []} pagination={false}
                            columns={jobColumns} scroll={{ x: `max(100%, ${tableScrollX(jobColumns)}px)` }} />
                    )}
                </section>
            </div>
        </PageContainer>
    );
}
