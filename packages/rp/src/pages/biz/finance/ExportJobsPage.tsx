import { Input, Progress, Select, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { EXPORT_KINDS, EXPORT_MAX, EXPORT_ST } from '@/biz/biz-dict';
import { useBizDelete, useBizRows, useBizUpdate } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizExportJobView } from '@/types/biz';
import { BizStatus, BizTabs, Cell, KpiRow, StatRules } from '../shared';

/** '3.8 MB' → 3.8；用于「占用空间」只统计已完成的文件 */
function sizeMB(v: string): number {
    const m = /([\d.]+)\s*MB/i.exec(v);
    return m?.[1] ? Number(m[1]) : 0;
}

export default function ExportJobsPage() {
    const [tab, setTab] = useState('all');
    const [draftQ, setDraftQ] = useState('');
    const [draftKind, setDraftKind] = useState('all');
    const [q, setQ] = useState('');
    const [kind, setKind] = useState('all');
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data = [], isFetching, refetch } = useBizRows<BizExportJobView>('bizExportJob');
    const update = useBizUpdate<BizExportJobView>('bizExportJob');
    const remove = useBizDelete('bizExportJob');

    const list = useMemo(
        () =>
            data
                .filter((j) => (tab === 'all' ? true : j.state === tab))
                .filter((j) => (kind === 'all' ? true : j.kind === kind))
                .filter((j) => {
                    if (!q) return true;
                    return `${j.code} ${j.menu} ${j.filter} ${j.file}`.toLowerCase().includes(q.toLowerCase());
                })
                .slice()
                .sort((a, b) => String(b.at).localeCompare(String(a.at))),
        [data, tab, kind, q],
    );

    const cnt = (st: string) => data.filter((j) => j.state === st).length;
    const active = cnt('queued') + cnt('running');
    const spaceMB = +data.filter((j) => j.state === 'done').reduce((s, j) => s + sizeMB(j.size), 0).toFixed(1);

    const search = () => {
        setQ(draftQ.trim());
        setKind(draftKind);
    };
    const reset = () => {
        setDraftQ('');
        setDraftKind('all');
        setQ('');
        setKind('all');
    };

    const conditions: SearchCondition[] = [];
    if (q) conditions.push({ key: 'q', label: '关键字', value: q, onRemove: () => { setQ(''); setDraftQ(''); } });
    if (kind !== 'all')
        conditions.push({
            key: 'kind',
            label: '来源页面',
            value: EXPORT_KINDS[kind] ?? kind,
            onRemove: () => {
                setKind('all');
                setDraftKind('all');
            },
        });

    const kindOptions = [{ label: '全部页面', value: 'all' }].concat(
        Object.entries(EXPORT_KINDS).map(([k, t]) => ({ label: t, value: k })),
    );

    const columns: ColumnProps<BizExportJobView>[] = [
        {
            title: '任务号',
            dataIndex: 'code',
            width: 148,
            render: (_: unknown, j) => <Cell main={<span className="biz-mono">{j.code}</span>} sub={j.by} />,
        },
        { title: '来源页面', dataIndex: 'menu', width: 108, render: (v: string) => <b style={{ fontWeight: 560 }}>{v}</b> },
        {
            title: '导出范围',
            dataIndex: 'filter',
            width: 200,
            render: (v: string) => (
                <span className="biz-cell__sub" title={v}>
                    {v || '全部'}
                </span>
            ),
        },
        { title: '行数', dataIndex: 'rows', width: 84, align: 'right', render: (v: number) => <span className="biz-num">{v.toLocaleString()}</span> },
        { title: '状态', dataIndex: 'state', width: 96, render: (v: string) => <BizStatus dict={EXPORT_ST} value={v} /> },
        {
            title: '文件 / 进度',
            dataIndex: 'file',
            width: 246,
            render: (_: unknown, j) => {
                if (j.state === 'queued' || j.state === 'running') {
                    return (
                        <div>
                            <Progress percent={Math.round(j.progress)} showInfo={false} size="small" />
                            <div className="biz-cell__sub">
                                {j.state === 'queued' ? '排队中' : '生成中'} · {Math.round(j.progress)}%
                            </div>
                        </div>
                    );
                }
                if (j.state === 'failed') return <span className="biz-danger biz-cell__sub">{j.err || '失败'}</span>;
                if (j.state === 'expired') return <span className="biz-dim biz-cell__sub">文件已清理（保留 7 天）</span>;
                return <Cell main={<span className="biz-mono">{j.file}</span>} sub={`${j.size} 下载 ${j.downloads} 次`} />;
            },
        },
        {
            title: '提交时间',
            dataIndex: 'at',
            width: 118,
            render: (v: string) => (
                <span className="biz-mono" title={v}>
                    {v.slice(5)}
                </span>
            ),
        },
        {
            title: '保留至',
            dataIndex: 'expireAt',
            width: 92,
            render: (v: string) => <span className="biz-dim" style={{ fontSize: 12 }}>{v ? `至 ${v.slice(5)}` : '—'}</span>,
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 152 },
    ];

    const actionsOf = (j: BizExportJobView): TableAction[] => {
        const del: TableAction = {
            key: 'del',
            label: '删除',
            danger: true,
            confirm: { title: '删除导出任务？', content: '删掉之后这份文件就下不到了，要的话得重新导出。已下载到本地的文件不受影响。' },
            onClick: () => remove.mutate(j.id, { onSuccess: () => Toast.success('已删除') }),
        };
        if (j.state === 'done') {
            return [
                {
                    key: 'download',
                    label: '下载',
                    onClick: () =>
                        update.mutate(
                            { id: j.id, body: { downloads: j.downloads + 1 } },
                            { onSuccess: () => Toast.success(`已开始下载：${j.file}`) },
                        ),
                },
                del,
            ];
        }
        if (j.state === 'failed') {
            return [
                {
                    key: 'retry',
                    label: '重试',
                    onClick: () =>
                        update.mutate(
                            { id: j.id, body: { state: 'running', progress: 30, err: '' } },
                            {
                                onSuccess: () => {
                                    Toast.info('已重新提交，任务在后台生成');
                                    // 原型没有真的后台进程：短延时后标记完成，让「重试 → 成功」这条链看得见
                                    window.setTimeout(() => {
                                        update.mutate({
                                            id: j.id,
                                            body: {
                                                state: 'done',
                                                progress: 100,
                                                file: `${j.menu}_重试.xlsx`,
                                                size: '1.0 MB',
                                                err: '',
                                            },
                                        });
                                    }, 1200);
                                },
                            },
                        ),
                },
                del,
            ];
        }
        if (j.state === 'expired') return [{ key: 'again', label: '重新导出', onClick: () => Toast.info('已按原范围重新提交，见最新任务') }, del];
        return [del];
    };

    const { columns: settled, columnSettings } = useColumnSettings('biz/exports', columns);
    const { columns: tableColumns } = useActionsColumn(settled, actionsOf);

    return (
        <PageContainer title="导出管理">
            <KpiRow
                items={[
                    { label: '进行中', value: active, unit: '个', alert: active > 0, desc: active ? '后台正在生成，可以先去干别的' : '当前没有在跑的任务' },
                    { label: '已完成', value: cnt('done'), unit: '个', desc: '可下载，文件保留 7 天' },
                    { label: '失败', value: cnt('failed'), unit: '个', alert: cnt('failed') > 0, desc: '失败可重试；连续失败要拆小范围' },
                    { label: '占用空间', value: spaceMB, unit: 'MB', compact: true, desc: '已生成的文件 · 过期自动清理' },
                ]}
            />
            <StatRules
                items={[
                    '<b>四个数都是全量，不随页签与筛选变化</b>；表头「共 X / Y」才是筛选结果。',
                    '<b>进行中 = 排队中 + 生成中。</b>这两个态都还没文件可下，页面上给进度条而不是下载按钮。',
                    '<b>已完成 = 状态 done。</b>文件保留 7 天，过期由系统清理。',
                    '<b>失败 = 状态 failed。</b>失败的记录不释放行数配额，重试是新提交一个任务。',
                    '<b>占用空间只算已生成的文件（done）</b>：排队 / 生成中 / 失败的任务没有文件，算进去会虚高。',
                    `<b>单个任务有行数上限（${EXPORT_MAX.toLocaleString()} 行）</b>：超了要先缩小筛选范围再导，不是「等久一点就行」。`,
                ]}
            />

            <BizTabs
                items={[
                    { key: 'all', label: '全部', count: data.length },
                    ...Object.entries(EXPORT_ST)
                        .map(([k, v]) => ({ key: k, label: v.t, count: cnt(k) }))
                        .filter((t) => t.count > 0),
                ]}
                value={tab}
                onChange={setTab}
                hint={`共 ${list.length} / ${data.length} · 单次上限 ${EXPORT_MAX.toLocaleString()} 行`}
            />

            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
                advanced={
                    <>
                        <SearchField label="关键字">
                            <Input value={draftQ} onChange={setDraftQ} onEnterPress={search} showClear placeholder="任务号 / 页面 / 文件名" />
                        </SearchField>
                        <SearchField label="来源页面">
                            <Select value={draftKind} onChange={(v) => setDraftKind(String(v))} optionList={kindOptions} style={{ width: '100%' }} />
                        </SearchField>
                    </>
                }
            >
                <Input value={draftQ} onChange={setDraftQ} onEnterPress={search} showClear placeholder="任务号 / 页面 / 文件名" style={{ width: 240 }} />
                <Select value={draftKind} onChange={(v) => setDraftKind(String(v))} optionList={kindOptions} style={{ width: 160 }} />
            </SearchToolbar>

            <Table<BizExportJobView>
                {...tableProps}
                rowKey="code"
                columns={tableColumns}
                dataSource={list}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>为什么是异步：</b>一张流水几十万行，同步生成会把页面卡几十秒 —— 人会以为坏了、去刷新，任务就白跑了。
                现在是「提交任务 → 后台生成 → 回来下载」，关掉页面也不影响。
                <br />
                <b>导出的是「那一刻的快照」。</b>导完之后数据再变，文件不会跟着变 —— 对账时以文件里的时间为准。
                <br />
                在订单管理 / 支付流水 / 退款管理 / 提现管理 / 未提现订单点「导出」，任务都会出现在这里。
            </div>
        </PageContainer>
    );
}
