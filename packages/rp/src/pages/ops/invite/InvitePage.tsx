import { Input, Table } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useOpsList } from '@/hooks/queries/ops';
import type { OpsInvitee, OpsUserRow } from '@/hooks/queries/ops';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import {
    OpsDetailSheet,
    OpsKv,
    OpsNote,
    OpsPageTip,
    OpsSection,
    OpsTitle,
    gmvText,
    inviteCount,
    inviteGmv,
} from '../ops';

const inviteeColumns: ColumnProps<OpsInvitee>[] = [
    { title: '用户ID', dataIndex: 'uid', width: 110, render: (value: string) => <span className="ops-mono">{value}</span> },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '注册时间', dataIndex: 'reg', width: 130, render: (value: string) => <span className="ops-sub">{value}</span> },
    {
        title: '累计消费',
        dataIndex: 'gmv',
        width: 120,
        render: (value: number) => (value ? <span className="ops-money">{gmvText(value)}</span> : <span className="ops-sub">¥0</span>),
    },
];

/** 邀请注册明细：邀请人 + 邀请数据 + 被邀请人明细 */
function InviteDetailSheet({ row, onClose }: { row: OpsUserRow; onClose: () => void }) {
    const count = inviteCount(row);
    const gmv = inviteGmv(row);
    return (
        <OpsDetailSheet visible title={`邀请注册 · ${row.nickname}`} onClose={onClose}>
            <OpsSection title="邀请人" />
            <OpsKv
                items={[
                    ['用户ID', <span className="ops-mono">{row.uid}</span>],
                    ['昵称', row.nickname],
                    ['注册时间', row.reg],
                ]}
            />
            <OpsSection title="邀请数据" />
            <OpsKv
                items={[
                    ['邀请人数', <span className="ops-money">{count} 人</span>],
                    ['下线累计消费', <span className="ops-money">{gmvText(gmv)}</span>],
                    [
                        '下线人均消费',
                        <span className="ops-money">{count ? gmvText(Math.round(gmv / count)) : '—'}</span>,
                    ],
                ]}
            />
            <OpsSection title={`被邀请人明细${count ? `（${count} 人）` : ''}`} />
            {count ? (
                <Table<OpsInvitee>
                    rowKey="uid"
                    columns={inviteeColumns}
                    dataSource={row.inviteUsers}
                    pagination={false}
                    size="small"
                />
            ) : (
                <div className="ops-sub">该用户暂无邀请记录，其下线的注册与消费数据会在此汇总。</div>
            )}
        </OpsDetailSheet>
    );
}

export default function InvitePage() {
    const [draft, setDraft] = useState('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detail, setDetail] = useState<OpsUserRow | null>(null);

    const { data, isFetching, refetch } = useOpsList<OpsUserRow>('user', {
        page,
        pageSize,
        keyword: keyword.trim(),
        sort: 'gmv',
    });

    const search = () => {
        setKeyword(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft('');
        setKeyword('');
        setPage(1);
    };

    const columns: ColumnProps<OpsUserRow>[] = [
        {
            title: '用户ID',
            dataIndex: 'uid',
            width: 120,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '昵称',
            dataIndex: 'nickname',
            render: (value: string, row: OpsUserRow) => (
                <div className="ops-cell2">
                    <span>{value}</span>
                    <span className="ops-cell2__sub">注册于 {row.reg}</span>
                </div>
            ),
        },
        {
            title: '邀请人数',
            dataIndex: 'inviteUsers',
            width: 120,
            render: (_: OpsInvitee[], row: OpsUserRow) =>
                inviteCount(row) ? <span className="ops-money">{inviteCount(row)} 人</span> : <span className="ops-sub">0 人</span>,
        },
        {
            title: '下线累计消费',
            dataIndex: 'inviteGmv',
            width: 160,
            render: (_: unknown, row: OpsUserRow) =>
                inviteGmv(row) ? <span className="ops-money">{gmvText(inviteGmv(row))}</span> : <span className="ops-sub">¥0</span>,
        },
        {
            title: '下线人均消费',
            dataIndex: 'inviteAvg',
            width: 140,
            render: (_: unknown, row: OpsUserRow) =>
                inviteCount(row) ? (
                    <span className="ops-money">{gmvText(Math.round(inviteGmv(row) / inviteCount(row)))}</span>
                ) : (
                    <span className="ops-sub">—</span>
                ),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 120 },
    ];

    const actionsOf = (row: OpsUserRow): TableAction[] => [
        { key: 'detail', label: '查看明细', onClick: () => setDetail(row) },
    ];

    const { columns: settledColumns, columnSettings } = useColumnSettings('ops/invite', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer
            title={<OpsTitle name="邀请注册" desc="邀请码带来的注册下线人数与下线消费" />}
            extra={<OpsPageTip>按下线累计消费倒序</OpsPageTip>}
        >
            <OpsNote>
                口径：<b>邀请人数</b> = 该用户邀请码注册成功的下线数量；<b>下线累计消费</b> = 这些被邀请人在平台的累计成交金额。
                列表按下线累计消费倒序，点击行可查看被邀请人明细。
            </OpsNote>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
            >
                <Input
                    placeholder="搜索用户ID / 展示ID / 昵称"
                    value={draft}
                    onChange={setDraft}
                    onEnterPress={search}
                    showClear
                    style={{ width: 300 }}
                />
            </SearchToolbar>
            <Table<OpsUserRow>
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
                    onChange: (current, size) => {
                        setPage(current);
                        setPageSize(size);
                    },
                }}
            />
            {detail && <InviteDetailSheet row={detail} onClose={() => setDetail(null)} />}
        </PageContainer>
    );
}
