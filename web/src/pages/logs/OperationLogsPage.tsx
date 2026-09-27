import { Button, DatePicker, Descriptions, Input, Select, SideSheet, Spin, Table, Tag, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useOperationLogDetail, useOperationLogs } from '@/hooks/queries/logs';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { OperationLogQuery, OperationLogView } from '@/types/api';
import { formatTimeRange, toTimeRange } from '@/utils/date';

/** 请求体是 JSON 就格式化，否则原样展示 */
export function prettyBody(body: string | null | undefined): string {
    if (!body) return '（无）';
    try {
        return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
        return body;
    }
}

function OperationLogDetail({ id, onClose }: { id: number; onClose: () => void }) {
    const { data, isPending } = useOperationLogDetail(id);
    return (
        <SideSheet visible title="操作详情" width={640} onCancel={onClose}>
            {isPending || !data ? (
                <Spin />
            ) : (
                <>
                    <Descriptions
                        align="left"
                        data={[
                            { key: '操作人', value: data.username || '—' },
                            { key: '模块', value: data.module },
                            { key: '描述', value: data.description },
                            { key: '请求', value: `${data.method} ${data.path}` },
                            { key: '结果', value: <StatusTag value={data.success} /> },
                            { key: '响应码', value: String(data.responseCode) },
                            { key: '耗时', value: `${data.durationMs} ms` },
                            { key: 'IP', value: data.ip || '—' },
                            { key: 'User-Agent', value: data.userAgent || '—' },
                            { key: '时间', value: data.createdAt },
                            ...(data.errorMessage ? [{ key: '错误信息', value: data.errorMessage }] : []),
                        ]}
                    />
                    <Typography.Title heading={6} style={{ margin: '16px 0 8px' }}>
                        请求体
                    </Typography.Title>
                    <pre className="code-block">{prettyBody(data.requestBody)}</pre>
                </>
            )}
        </SideSheet>
    );
}

interface Filters {
    username: string;
    module: string;
    success: boolean | undefined;
    range: Date[] | undefined;
}

const EMPTY_FILTERS: Filters = { username: '', module: '', success: undefined, range: undefined };

export default function OperationLogsPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detailId, setDetailId] = useState<number | null>(null);

    const query: OperationLogQuery = {
        page,
        pageSize,
        ...(filters.username.trim() ? { username: filters.username.trim() } : {}),
        ...(filters.module.trim() ? { module: filters.module.trim() } : {}),
        ...(filters.success !== undefined ? { success: filters.success } : {}),
        ...toTimeRange(filters.range),
    };
    const { data, isFetching, refetch } = useOperationLogs(query);

    const search = () => {
        setFilters(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };

    // 已选条件只反映已生效的查询；删掉一个即清空该字段（草稿一并清）并回第 1 页
    const remove = (field: keyof Filters) => () => {
        setFilters((f) => ({ ...f, [field]: EMPTY_FILTERS[field] }));
        setDraft((d) => ({ ...d, [field]: EMPTY_FILTERS[field] }));
        setPage(1);
    };
    const range = formatTimeRange(filters.range);
    const conditions: SearchCondition[] = [
        ...(filters.username.trim()
            ? [{ key: 'username', label: '操作人', value: filters.username.trim(), onRemove: remove('username') }]
            : []),
        ...(filters.module.trim() ? [{ key: 'module', label: '模块', value: filters.module.trim(), onRemove: remove('module') }] : []),
        ...(filters.success !== undefined
            ? [{ key: 'success', label: '结果', value: filters.success ? '成功' : '失败', onRemove: remove('success') }]
            : []),
        ...(range ? [{ key: 'range', label: '时间', value: range, onRemove: remove('range') }] : []),
    ];

    const columns: ColumnProps<OperationLogView>[] = [
        { title: '操作人', dataIndex: 'username', width: 110, render: (v: string | null) => v || '—' },
        { title: '模块', dataIndex: 'module', width: 110 },
        { title: '描述', dataIndex: 'description', width: 150 },
        {
            title: '请求',
            dataIndex: 'path',
            render: (v: string, r: OperationLogView) => (
                <span>
                    <Tag size="small" style={{ marginRight: 6 }}>
                        {r.method}
                    </Tag>
                    {v}
                </span>
            ),
        },
        { title: '结果', dataIndex: 'success', width: 72, render: (v: boolean) => <StatusTag value={v} /> },
        { title: '耗时', dataIndex: 'durationMs', width: 80, render: (v: number) => `${v} ms` },
        // IP 130：最宽的 IPv4（255.255.255.255）约 104 + 24 内边距，窄了会折行（list-view.md 二.4）
        { title: 'IP', dataIndex: 'ip', width: 130, render: (v: string | null) => v || '—' },
        { title: '时间', dataIndex: 'createdAt', width: 158 },
        {
            title: '操作',
            dataIndex: 'actions',
            fixed: 'right',
            width: 72,
            render: (_: unknown, r: OperationLogView) => (
                <Button theme="borderless" size="small" onClick={() => setDetailId(r.id)}>
                    详情
                </Button>
            ),
        },
    ];

    const { columns: tableColumns, columnSettings } = useColumnSettings('logs/operation', columns);

    return (
        <PageContainer>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
            >
                <Input
                    placeholder="操作人"
                    value={draft.username}
                    onChange={(username) => setDraft((d) => ({ ...d, username }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 140 }}
                />
                <Input
                    placeholder="模块"
                    value={draft.module}
                    onChange={(module) => setDraft((d) => ({ ...d, module }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 140 }}
                />
                <Select
                    placeholder="结果"
                    value={draft.success === undefined ? undefined : String(draft.success)}
                    onChange={(v) => setDraft((d) => ({ ...d, success: v === undefined ? undefined : v === 'true' }))}
                    optionList={[
                        { label: '成功', value: 'true' },
                        { label: '失败', value: 'false' },
                    ]}
                    showClear
                    style={{ width: 110 }}
                />
                <DatePicker
                    type="dateTimeRange"
                    value={draft.range ?? []}
                    onChange={(v) => setDraft((d) => ({ ...d, range: Array.isArray(v) && v.length ? (v as Date[]) : undefined }))}
                    style={{ width: 360 }}
                />
            </SearchToolbar>
            <Table<OperationLogView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{
                    currentPage: page,
                    pageSize,
                    pageSizeOpts,
                    total: data?.total ?? 0,
                    showSizeChanger: true,
                    showTotal: true,
                    onChange: (p, s) => {
                        setPage(p);
                        setPageSize(s);
                    },
                }}
            />
            {detailId !== null && <OperationLogDetail id={detailId} onClose={() => setDetailId(null)} />}
        </PageContainer>
    );
}
