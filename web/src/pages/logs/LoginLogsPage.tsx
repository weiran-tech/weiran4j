import { DatePicker, Input, Select, Table, Tag, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useLoginLogs } from '@/hooks/queries/logs';
import type { LoginLogQuery, LoginLogView } from '@/types/api';
import { toTimeRange } from '@/utils/date';

interface Filters {
    username: string;
    status: 'success' | 'fail' | undefined;
    eventType: 'login' | 'logout' | undefined;
    range: Date[] | undefined;
}

const EMPTY_FILTERS: Filters = { username: '', status: undefined, eventType: undefined, range: undefined };

export default function LoginLogsPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const query: LoginLogQuery = {
        page,
        pageSize,
        ...(filters.username.trim() ? { username: filters.username.trim() } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.eventType ? { eventType: filters.eventType } : {}),
        ...toTimeRange(filters.range),
    };
    const { data, isFetching } = useLoginLogs(query);

    const search = () => {
        setFilters(draft);
        setPage(1);
    };

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

    return (
        <PageContainer>
            <SearchToolbar
                onSearch={search}
                onReset={() => {
                    setDraft(EMPTY_FILTERS);
                    setFilters(EMPTY_FILTERS);
                    setPage(1);
                }}
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
                    optionList={[
                        { label: '登录', value: 'login' },
                        { label: '登出', value: 'logout' },
                    ]}
                    showClear
                    style={{ width: 110 }}
                />
                <Select
                    placeholder="结果"
                    value={draft.status}
                    onChange={(v) => setDraft((d) => ({ ...d, status: v as Filters['status'] }))}
                    optionList={[
                        { label: '成功', value: 'success' },
                        { label: '失败', value: 'fail' },
                    ]}
                    showClear
                    style={{ width: 110 }}
                />
                <DatePicker
                    type="dateTimeRange"
                    value={draft.range ?? []}
                    onChange={(v) => setDraft((d) => ({ ...d, range: Array.isArray(v) ? (v as Date[]) : undefined }))}
                    style={{ width: 360 }}
                />
            </SearchToolbar>
            <Table<LoginLogView>
                rowKey="id"
                columns={columns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: 1050 }}
                pagination={{
                    currentPage: page,
                    pageSize,
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
