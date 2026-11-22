import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { useQueryClient } from '@tanstack/react-query';
import { BatchJobWorkbench, type BatchJob, type BatchJobDataSource } from '@/components/BatchJobWorkbench';

const KINDS = [{ label: 'Excel 逐行导入', value: 'example_excel', accept: '.xlsx' }, { label: 'ZIP 逐文件处理', value: 'example_zip', accept: '.zip' }];
const PHASES = ['waiting', 'validating', 'deciding', 'processing', 'finished'];

function SimulatedResult({ job }: { job: BatchJob }) {
    return <p>模拟结果：{job.succeeded} 项通过，{job.failed} 项失败；未写入业务数据。</p>;
}

export default function DemoBatchPage() {
    const client = useQueryClient();
    const jobs = useRef<BatchJob[]>([]);
    const [error, setError] = useState('');
    const [failRead, setFailRead] = useState(false);
    const [failCreate, setFailCreate] = useState(false);
    const [partial, setPartial] = useState(false);
    const controls = useRef({ failRead, failCreate, partial });
    controls.current = { failRead, failCreate, partial };
    const dataSource = useMemo<BatchJobDataSource>(() => ({
        list: async () => { if (controls.current.failRead) throw new Error('模拟读取失败'); return structuredClone(jobs.current); },
        get: async (id) => structuredClone(jobs.current.find((job) => job.id === id)!),
        details: async (id, params) => {
            const job = jobs.current.find((entry) => entry.id === id)!;
            const stage = params.get('stage') ?? 'validating';
            const list = Array.from({ length: 3 }, (_, index) => ({
                id: index + 1, itemNo: index + 1, itemName: `模拟项 ${index + 1}`, stage,
                status: job.failed && index === 2 ? 'failed' : 'succeeded',
                message: job.failed && index === 2 ? '模拟字段缺失' : null,
                sourceLocation: `第 ${index + 2} 行 / 文件`, idempotencyKey: String(index),
                displayData: null, resultType: null, resultId: null, createdAt: '2026-11-23 10:00:00',
            })).filter((item) => !params.has('status') || item.status === params.get('status'));
            return { list, total: list.length, page: 1, pageSize: 20 };
        },
        create: async (kind, file) => {
            if (controls.current.failCreate) { setError('模拟上传失败，关闭失败开关后可重试。'); throw new Error('模拟上传失败'); }
            setError('');
            const job: BatchJob = { id: jobs.current.length + 1, kind, sourceName: file.name, status: 'queued', phase: 'waiting', total: null, selectedCount: null, processed: 0, succeeded: 0, failed: 0, errorMessage: null, decidedAt: null, createdAt: '2026-11-23 10:00:00', finishedAt: null };
            jobs.current.unshift(job);
            return structuredClone(job);
        },
        cancel: async (id) => {
            const job = jobs.current.find((entry) => entry.id === id)!;
            job.status = 'cancelled'; job.phase = 'finished';
            return structuredClone(job);
        },
    }), []);
    const refresh = () => { void client.invalidateQueries({ queryKey: ['batch-jobs'] }); void client.invalidateQueries({ queryKey: ['batch-job'] }); };
    return <>
        <div className="demo-page__controls">
            <label><input type="checkbox" checked={failRead} onChange={(event) => setFailRead(event.target.checked)} />模拟列表读取失败</label>
            <label><input type="checkbox" checked={failCreate} onChange={(event) => setFailCreate(event.target.checked)} />模拟上传失败</label>
            <label><input type="checkbox" checked={partial} onChange={(event) => setPartial(event.target.checked)} />模拟部分失败</label>
            <Button onClick={refresh}>刷新 / 重试</Button>
            <Button onClick={() => {
                for (const job of jobs.current.filter((item) => ['queued', 'running'].includes(item.status))) {
                    const phase = PHASES[Math.min(PHASES.indexOf(job.phase) + 1, 4)]!;
                    Object.assign(job, { phase, status: phase === 'finished' ? partial ? 'partial_failed' : 'succeeded' : 'running', total: 3, selectedCount: partial ? 2 : 3, failed: partial ? 1 : 0, succeeded: phase === 'finished' ? partial ? 2 : 3 : 0, processed: phase === 'finished' ? 3 : 0 });
                }
                refresh();
            }}>推进模拟阶段</Button>
        </div>
        {error && <p role="alert">{error}</p>}
        <BatchJobWorkbench title="批处理工作台" description="仅模拟交互，不解析文件、不写入数据库" kinds={KINDS} dataSource={dataSource}
            uploadHint="选择任意对应扩展名的本地文件；点击上方按钮手动推进各阶段。"
            ResultPanel={SimulatedResult} />
    </>;
}
