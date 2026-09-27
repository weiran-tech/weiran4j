import { DatePicker, Input, Select, Table, Tag, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useLoginLogs } from '@/hooks/queries/logs';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { LoginLogQuery, LoginLogView } from '@/types/api';
import { formatTimeRange, toTimeRange } from '@/utils/date';

interface Filters {
    username: string;
    status: 'success' | 'fail' | undefined;
    eventType: 'login' | 'logout' | undefined;
    range: Date[] | undefined;
}

const EMPTY_FILTERS: Filters = { username: '', status: undefined, eventType: undefined, range: undefined };

const EVENT_OPTIONS = [
    { label: '登录', value: 'login' },
    { label: '登出', value: 'logout' },
];
const STATUS_OPTIONS = [
    { label: '成功', value: 'success' },
    { label: '失败', value: 'fail' },
];

export default function LoginLogsPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);

    const query: LoginLogQuery = {
        page,
        pageSize,
        ...(filters.username.trim() ? { username: filters.username.trim() } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.eventType ? { eventType: filters.eventType } : {}),
        ...toTimeRange(filters.range),
    };
    const { data, isFetching, refetch } = useLoginLogs(query);

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
    const labelOf = (options: { label: string; value: string }[], v: string) => options.find((o) => o.value === v)?.label ?? v;
    const range = formatTimeRange(filters.range);
    const conditions: SearchCondition[] = [
        ...(filters.username.trim()
            ? [{ key: 'username', label: '用户名', value: filters.username.trim(), onRemove: remove('username') }]
            : []),
        ...(filters.eventType
            ? [{ key: 'eventType', label: '事件', value: labelOf(EVENT_OPTIONS, filters.eventType), onRemove: remove('eventType') }]
            : []),
        ...(filters.status
            ? [{ key: 'status', label: '结果', value: labelOf(STATUS_OPTIONS, filters.status), onRemove: remove('status') }]
            : []),
        ...(range ? [{ key: 'range', label: '时间', value: range, onRemove: remove('range') }] : []),
    ];

    const columns: ColumnProps<LoginLogView>[] = [
        { title: '用户名', dataIndex: 'username', width: 120 },
        {
            title: '事件',
            dataIndex: 'eventType',
            width: 72,
            render: (v: string) => (
                <Tag size="small" color={v === 'login' ? 'blue' : 'grey'}>
                    {v === 'login' ? '登录' : '登出'}
                </Tag>
            ),
        },
        { title: '结果', dataIndex: 'status', width: 72, render: (v: string) => <StatusTag value={v} /> },
        { title: 'IP', dataIndex: 'ip', width: 130, render: (v: string | null) => v || '—' },
        { title: '浏览器', dataIndex: 'browser', width: 130, render: (v: string | null) => v || '—' },
        { title: '操作系统', dataIndex: 'os', width: 130, render: (v: string | null) => v || '—' },
        {
            title: '信息',
            dataIndex: 'message',
            render: (v: string | null, r: LoginLogView) => (
                <Typography.Text ellipsis={{ showTooltip: { opts: { content: r.userAgent ?? v ?? '' } } }} style={{ maxWidth: 260 }}>
                    {v || '—'}
                </Typography.Text>
            ),
        },
        { title: '时间', dataIndex: 'createdAt', width: 164 },
    ];

    const { columns: tableColumns, columnSettings } = useColumnSettings('logs/login', columns);

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
                    placeholder="用户名"
                    value={draft.username}
                    onChange={(username) => setDraft((d) => ({ ...d, username }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 160 }}
                />
                <Select
                    placeholder="事件"
                    value={draft.eventType}
                    onChange={(v) => setDraft((d) => ({ ...d, eventType: v as Filters['eventType'] }))}
                    optionList={EVENT_OPTIONS}
                    showClear
                    style={{ width: 110 }}
                />
                <Select
                    placeholder="结果"
                    value={draft.status}
                    onChange={(v) => setDraft((d) => ({ ...d, status: v as Filters['status'] }))}
                    optionList={STATUS_OPTIONS}
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
            <Table<LoginLogView>
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
        </PageContainer>
    );
}
