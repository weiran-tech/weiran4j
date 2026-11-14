import { Button, DatePicker, Input, Select, SideSheet, Table, Tag } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { ListEmptyState, ListFeedback } from '@/components/ListFeedback';
import { OperationLogDetails } from '@/components/OperationLogDetails';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useOperationLogDetail, useOperationLogs } from '@/hooks/queries/logs';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { OperationLogQuery, OperationLogView } from '@/types/api';
import { formatTimeRange, toTimeRange } from '@/utils/date';

export { prettyBody } from '@/components/OperationLogDetails';

function OperationLogDetail({ id, onClose }: { id: number; onClose: () => void }) {
    const query = useOperationLogDetail(id);
    return (
        <SideSheet visible title="操作详情" width={640} onCancel={onClose}>
            <OperationLogDetails query={query} onRetry={() => void query.refetch()} />
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
    const { data, isFetching, isError, refetch } = useOperationLogs(query);

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
        { title: 'ID', dataIndex: 'id', width: 180 },
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
            {isError && <ListFeedback hasData={data !== undefined} retrying={isFetching} onRetry={() => void refetch()} />}
            <Table<OperationLogView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                empty={isFetching || isError ? <span aria-hidden="true" /> : <ListEmptyState filtered={conditions.length > 0} onReset={reset} />}
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
