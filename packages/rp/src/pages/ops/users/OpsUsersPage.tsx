import { Input, Select, Table } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useOpsList, useOpsListAll } from '@/hooks/queries/ops';
import type { OpsUserRow } from '@/hooks/queries/ops';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import { OpsNote, OpsPageTip, OpsStatusTag, OpsTitle } from '../ops';
import { SettleDetailModal, settleReady, type SettleSubject, type SettleTab } from './SettleDetailModal';
import { EditDisplayModal, UserDetailSheet } from './UserSheets';

interface Filters {
    keyword: string;
    role: string | undefined;
    real: string | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', role: undefined, real: undefined };

/**
 * 运营后台用户行 → 结算信息弹窗的入参。
 *
 * 结算信息挂在用户行上（`settlement`），日志沿用用户自己的操作记录 ——
 * 原来的「用户结算信息」页按同样的字段渲染，这里只换数据来源，弹窗逻辑不变。
 */
function toSettleSubject(row: OpsUserRow): SettleSubject {
    const s = row.settlement;
    return {
        code: row.displayId || row.uid,
        nick: row.nickname,
        real: row.realName,
        idNo: row.idcard,
        // 实名通过就以「已实名」为准：结算数据是后来才补到用户行上的，
        // 旧缓存里字段可能缺失，那时不该把按钮藏起来（弹窗会显示空态，比消失诚实）。
        verify: s?.verify ?? (row.real === '已实名' ? 'ok' : 'none'),
        bank: s?.bank ?? null,
        alipay: s?.alipay ?? null,
        logs: (row.logs ?? []).map((log) => ({
            at: log.time,
            who: log.operator,
            act: log.action,
            note: log.remark,
        })),
    };
}

export default function OpsUsersPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detail, setDetail] = useState<OpsUserRow | null>(null);
    const [editing, setEditing] = useState<OpsUserRow | null>(null);
    const [settleOf, setSettleOf] = useState<{ row: OpsUserRow; tab: SettleTab } | null>(null);

    const { data, isFetching, refetch } = useOpsList<OpsUserRow>('user', {
        page,
        pageSize,
        keyword: filters.keyword.trim(),
        role: filters.role,
        real: filters.real,
    });
    const { data: users } = useOpsListAll<OpsUserRow>('user');

    const search = () => {
        setFilters(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };

    const columns: ColumnProps<OpsUserRow>[] = [
        {
            title: '用户ID',
            dataIndex: 'uid',
            width: 110,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '展示ID',
            dataIndex: 'displayId',
            width: 120,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '昵称',
            dataIndex: 'nickname',
            render: (value: string, row: OpsUserRow) => (
                <div className="ops-cell2">
                    <span>{value}</span>
                    <span className="ops-cell2__sub">{row.role}</span>
                </div>
            ),
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            width: 130,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        { title: '注册时间', dataIndex: 'reg', width: 120, render: (value: string) => <span className="ops-sub">{value}</span> },
        {
            title: '姓名',
            dataIndex: 'realName',
            width: 110,
            render: (value: string) => (value === '—' ? <span className="ops-sub">—</span> : value),
        },
        { title: '实名状态', dataIndex: 'real', width: 110, render: (value: string) => <OpsStatusTag value={value} /> },
        {
            title: '身份证号',
            dataIndex: 'idcard',
            width: 180,
            render: (value: string) =>
                value === '—' ? <span className="ops-sub">未实名</span> : <span className="ops-mono">{value}</span>,
        },
        // 操作列平铺 4 个文字按钮（详情 / 修改展示ID / 结算信息 / 日志），
        // 150px 放不下，「结算信息」会被挤到列外看不见。
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 236 },
    ];

    const actionsOf = (row: OpsUserRow): TableAction[] => {
        const subject = toSettleSubject(row);
        return [
            { key: 'detail', label: '详情', onClick: () => setDetail(row) },
            { key: 'editDisplay', label: '修改展示ID', onClick: () => setEditing(row) },
            // 结算信息只有实名通过的用户才有 —— 未实名连三方开户都走不到，库里没有卡号也没有支付宝账号
            ...(settleReady(subject)
                ? [{ key: 'settle', label: '结算信息', onClick: () => setSettleOf({ row, tab: 'bank' as SettleTab }) }]
                : []),
            { key: 'logs', label: '日志', onClick: () => setSettleOf({ row, tab: 'logs' as SettleTab }) },
        ];
    };

    const { columns: settledColumns, columnSettings } = useColumnSettings('ops/users', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer
            title={<OpsTitle name="用户管理" desc="买家 / 卖家 / 商家账号与实名信息" />}
            extra={<OpsPageTip>用户ID 不可变更</OpsPageTip>}
        >
            <OpsNote>
                字段说明：<b>用户ID</b> 为系统内部主键，不可变更；<b>展示ID</b> 为对外展示编号，可自定义。
                姓名与身份证号取自实名认证信息，列表按<b>脱敏</b>展示（保留前 4 位与后 4 位）。
            </OpsNote>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
            >
                <Input
                    placeholder="搜索用户ID / 展示ID / 昵称 / 手机号 / 姓名"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 300 }}
                />
                <Select
                    placeholder="角色"
                    value={draft.role}
                    onChange={(value) => setDraft((draftValue) => ({ ...draftValue, role: value ? String(value) : undefined }))}
                    optionList={[
                        { label: '商家', value: '商家' },
                        { label: '买家', value: '买家' },
                    ]}
                    showClear
                    style={{ width: 120 }}
                />
                <Select
                    placeholder="实名"
                    value={draft.real}
                    onChange={(value) => setDraft((draftValue) => ({ ...draftValue, real: value ? String(value) : undefined }))}
                    optionList={[
                        { label: '已实名', value: '已实名' },
                        { label: '未实名', value: '未实名' },
                    ]}
                    showClear
                    style={{ width: 120 }}
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
            {detail && (
                <UserDetailSheet
                    row={detail}
                    onEditDisplay={(row) => {
                        setDetail(null);
                        setEditing(row);
                    }}
                    onClose={() => setDetail(null)}
                />
            )}
            {editing && <EditDisplayModal row={editing} users={users ?? []} onClose={() => setEditing(null)} />}
            {settleOf && (
                <SettleDetailModal
                    subject={toSettleSubject(settleOf.row)}
                    initialTab={settleOf.tab}
                    onClose={() => setSettleOf(null)}
                />
            )}
        </PageContainer>
    );
}
