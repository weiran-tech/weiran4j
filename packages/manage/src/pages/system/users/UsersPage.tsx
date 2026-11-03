import { Button, DatePicker, Input, InputNumber, Select, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { DictSelect } from '@/components/DictSelect';
import { DictTag } from '@/components/DictTag';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useProviders } from '@/hooks/queries/identities';
import { StatusTag } from '@/components/StatusTag';
import { useDictOptions } from '@/hooks/queries/dicts';
import { useRoleOptions } from '@/hooks/queries/roles';
import { useDeleteUser, useUserList } from '@/hooks/queries/users';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { Gender, Status, UserQuery, UserView } from '@/types/api';
import { toDayRange } from '@/utils/date';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserFormModal } from './UserFormModal';
import { UserIdentitiesModal } from './UserIdentitiesModal';
import { SetUserAccountFieldModal } from './SetUserAccountFieldModal';

/** 工具栏快速搜索（keyword / status）+ 高级筛选的单字段条件（契约 §6.2） */
export interface Filters {
    keyword: string;
    status: Status | undefined;
    username: string;
    userId: number | undefined;
    phone: string;
    roleId: number | undefined;
    gender: Gender | undefined;
    /** 按天选择；发请求时补成当天 00:00:00 / 23:59:59 */
    createdRange: Date[] | undefined;
    lastLoginRange: Date[] | undefined;
}

export const EMPTY_FILTERS: Filters = {
    keyword: '',
    status: undefined,
    username: '',
    userId: undefined,
    phone: '',
    roleId: undefined,
    gender: undefined,
    createdRange: undefined,
    lastLoginRange: undefined,
};

export function toQuery(f: Filters, page: number, pageSize: number): UserQuery {
    const text = (key: 'keyword' | 'username' | 'phone') => (f[key].trim() ? { [key]: f[key].trim() } : {});
    const created = toDayRange(f.createdRange);
    const lastLogin = toDayRange(f.lastLoginRange);
    return {
        page,
        pageSize,
        ...text('keyword'),
        ...(f.status ? { status: f.status } : {}),
        ...text('username'),
        ...(f.userId !== undefined ? { userId: f.userId } : {}),
        ...text('phone'),
        ...(f.roleId !== undefined ? { roleId: f.roleId } : {}),
        ...(f.gender ? { gender: f.gender } : {}),
        ...(created.start ? { createdStartTime: created.start } : {}),
        ...(created.end ? { createdEndTime: created.end } : {}),
        ...(lastLogin.start ? { lastLoginStartTime: lastLogin.start } : {}),
        ...(lastLogin.end ? { lastLoginEndTime: lastLogin.end } : {}),
    };
}

/** 日期范围的标签文本：两端「开始 ~ 结束」，只有一端时「≥ 开始」/「≤ 结束」；未选返回 null */
export function formatDayRange(range: Date[] | undefined): string | null {
    const [start, end] = range ?? [];
    const day = (d: Date) => dayjs(d).format('YYYY-MM-DD');
    if (start && end) return `${day(start)} ~ ${day(end)}`;
    if (start) return `≥ ${day(start)}`;
    if (end) return `≤ ${day(end)}`;
    return null;
}

/** 操作列平铺宽度：编辑 / 设置账号信息 / 重置密码 / 删除 */
const ACTIONS_WIDTH = 300;
/**
 * 基础操作列按四个按钮完整显示预留 300px；配置了外部身份提供方时多一个「外部身份」（约 68 + 间距 4）：372。
 * 列宽合计从 1395 变成 1467，1440 宽下双列 / 侧边 / 混合布局会横向滚动（操作列固定在右侧）——只影响启用了 SSO 的部署，
 * 登记在 state/bizs/sys_user.md §6
 */
const ACTIONS_WIDTH_WITH_IDENTITY = 372;
/** 弹性列「角色」计算滚动宽度时的最小值：一个角色标签约 64，多个时换行 */
const ROLE_MIN_WIDTH = 78;

export default function UsersPage() {
    const { hasAnyPermission } = usePermission();
    // 没配置外部身份提供方时不显示「外部身份」操作，操作列保持原宽度
    const hasIdentityProviders = (useProviders().data?.providers.length ?? 0) > 0;
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    /** undefined = 关闭；null = 新增；对象 = 编辑 */
    const [editing, setEditing] = useState<UserView | null | undefined>(undefined);
    const [resetting, setResetting] = useState<UserView | null>(null);
    const [identityOf, setIdentityOf] = useState<UserView | null>(null);
    const [settingAccountOf, setSettingAccountOf] = useState<UserView | null>(null);

    const { data, isFetching, refetch } = useUserList(toQuery(filters, page, pageSize));
    const deleteUser = useDeleteUser();

    const search = () => {
        setFilters(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };

    // 已选条件标签只反映「已生效」的查询（filters），不反映还没点查询的草稿；删掉一个即清空该字段并重新查询
    const statusOptions = useDictOptions('sys_common_status');
    const genderOptions = useDictOptions('sys_user_gender');
    const { data: roleOptions } = useRoleOptions();
    const conditions = ((): SearchCondition[] => {
        const remove = (field: keyof Filters) => () => {
            setFilters((f) => ({ ...f, [field]: EMPTY_FILTERS[field] }));
            setDraft((d) => ({ ...d, [field]: EMPTY_FILTERS[field] }));
            setPage(1);
        };
        const list: SearchCondition[] = [];
        const keyword = filters.keyword.trim();
        if (keyword)
            list.push({
                key: 'keyword',
                label: '关键字',
                value: keyword,
                onRemove: remove('keyword'),
            });
        if (filters.status) {
            const label = statusOptions.find((o) => o.value === filters.status)?.label ?? filters.status;
            list.push({
                key: 'status',
                label: '状态',
                value: label,
                onRemove: remove('status'),
            });
        }
        const username = filters.username.trim();
        if (username)
            list.push({
                key: 'username',
                label: '用户名',
                value: username,
                onRemove: remove('username'),
            });
        if (filters.userId !== undefined) {
            list.push({
                key: 'userId',
                label: '用户 ID',
                value: String(filters.userId),
                onRemove: remove('userId'),
            });
        }
        const phone = filters.phone.trim();
        if (phone)
            list.push({
                key: 'phone',
                label: '手机号',
                value: phone,
                onRemove: remove('phone'),
            });
        if (filters.roleId !== undefined) {
            const name = roleOptions?.find((r) => r.id === filters.roleId)?.name ?? `#${filters.roleId}`;
            list.push({
                key: 'roleId',
                label: '角色',
                value: name,
                onRemove: remove('roleId'),
            });
        }
        if (filters.gender) {
            const label = genderOptions.find((o) => o.value === filters.gender)?.label ?? filters.gender;
            list.push({
                key: 'gender',
                label: '性别',
                value: label,
                onRemove: remove('gender'),
            });
        }
        const created = formatDayRange(filters.createdRange);
        if (created)
            list.push({
                key: 'createdRange',
                label: '创建时间',
                value: created,
                onRemove: remove('createdRange'),
            });
        const lastLogin = formatDayRange(filters.lastLoginRange);
        if (lastLogin) {
            list.push({
                key: 'lastLoginRange',
                label: '最后登录',
                value: lastLogin,
                onRemove: remove('lastLoginRange'),
            });
        }
        return list;
    })();

    // 列宽合计（含弹性列「角色」按 ROLE_MIN_WIDTH 计）为 1316：1440 宽下双列布局可用 1115，表格横向滚动，操作列固定在右侧；
    // 配置外部身份提供方时多一个「外部身份」操作，合计 1388（见 ACTIONS_WIDTH_WITH_IDENTITY），部分布局仍会横向滚动；
    // 视口 < 992（便捷搜索隐藏）时操作列收成「…」（useCompactActions）；其间放不下就横向滚动（操作列固定在右侧）。
    // 各固定列已压到「内容 + 24 内边距」：时间 158（156 时小数宽度会把时分秒挤到第二行）；手机 116（Inter 数字不等宽，最宽的 11 位约 91）；
    // 性别 52；ID 160；用户名加宽到 140，减少常见用户名折行。操作列 300 可完整展示四个文字按钮。
    const columns: ColumnProps<UserView>[] = [
        { title: 'ID', dataIndex: 'id', width: 160 },
        { title: '用户名', dataIndex: 'username', width: 140 },
        { title: '昵称', dataIndex: 'nickname', width: 90 },
        {
            title: '角色',
            dataIndex: 'roleNames',
            // 弹性列：标签多了换行而不是溢出到隔壁列
            render: (names: string[]) =>
                names?.length ? (
                    <Space wrap spacing={4}>
                        {names.map((n) => (
                            <Tag key={n} size="small">
                                {n}
                            </Tag>
                        ))}
                    </Space>
                ) : (
                    '—'
                ),
        },
        {
            title: '手机',
            dataIndex: 'phone',
            width: 116,
            render: (v: string | null) => v || '—',
        },
        {
            title: '性别',
            dataIndex: 'gender',
            width: 52,
            render: (v: string | null) => <DictTag dictCode="sys_user_gender" value={v} />,
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 64,
            render: (v: Status) => <StatusTag value={v} />,
        },
        {
            title: '最后登录',
            dataIndex: 'lastLoginAt',
            width: 158,
            render: (v: string | null) => v || '—',
        },
        { title: '创建时间', dataIndex: 'createdAt', width: 158 },
    ];

    const userActions = (record: UserView): TableAction[] => [
        {
            key: 'edit',
            label: '编辑',
            permission: 'system:user:update',
            onClick: () => setEditing(record),
        },
        {
            key: 'account-field',
            label: '设置账号信息',
            permission: 'system:user:update',
            onClick: () => setSettingAccountOf(record),
        },
        {
            key: 'reset',
            label: '重置密码',
            permission: 'system:user:reset-password',
            onClick: () => setResetting(record),
        },
        {
            key: 'identities',
            label: '外部身份',
            permission: 'system:user:identity',
            onClick: () => setIdentityOf(record),
        },
        {
            key: 'delete',
            label: '删除',
            permission: 'system:user:delete',
            danger: true,
            disabled: record.isBuiltin,
            confirm: {
                title: '确定删除该用户？',
                content: `删除后「${record.username}」将无法登录`,
            },
            onClick: () =>
                deleteUser.mutate(record.id, {
                    onSuccess: () => Toast.success('已删除'),
                }),
        },
    ].filter((a) => a.key !== 'identities' || hasIdentityProviders);
    if (hasAnyPermission('system:user:update', 'system:user:reset-password', 'system:user:identity', 'system:user:delete')) {
        // 宽度与渲染在下面按是否收起替换
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            fixed: 'right',
            width: hasIdentityProviders ? ACTIONS_WIDTH_WITH_IDENTITY : ACTIONS_WIDTH,
        });
    }

    const { columns: settledColumns, columnSettings } = useColumnSettings('system/users', columns);
    // 窄屏（与便捷搜索隐藏同一断点）操作列收成「…」
    const { columns: tableColumns } = useActionsColumn(settledColumns, userActions);

    return (
        <PageContainer>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
                leading={
                    <Permission code="system:user:create">
                        <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                            新增用户
                        </Button>
                    </Permission>
                }
                // 高级筛选是单字段查询（设计稿「用户列表」顺序）；状态与工具栏共用同一份草稿
                advanced={
                    <>
                        <SearchField label="用户名">
                            <Input
                                placeholder="请输入用户名"
                                value={draft.username}
                                onChange={(username) => setDraft((d) => ({ ...d, username }))}
                                onEnterPress={search}
                                showClear
                            />
                        </SearchField>
                        <SearchField label="用户 ID">
                            <InputNumber
                                placeholder="请输入用户 ID"
                                hideButtons
                                min={1}
                                precision={0}
                                value={draft.userId ?? ''}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        userId: typeof v === 'number' ? v : undefined,
                                    }))
                                }
                                onEnterPress={search}
                            />
                        </SearchField>
                        <SearchField label="手机号">
                            <Input
                                placeholder="请输入手机号"
                                value={draft.phone}
                                onChange={(phone) => setDraft((d) => ({ ...d, phone }))}
                                onEnterPress={search}
                                showClear
                            />
                        </SearchField>
                        <SearchField label="角色">
                            <Select
                                placeholder="请选择角色"
                                value={draft.roleId}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        roleId: typeof v === 'number' ? v : undefined,
                                    }))
                                }
                                optionList={(roleOptions ?? []).map((r) => ({
                                    value: r.id,
                                    label: r.name,
                                }))}
                                filter
                                showClear
                            />
                        </SearchField>
                        <SearchField label="状态">
                            <DictSelect
                                dictCode="sys_common_status"
                                placeholder="全部"
                                value={draft.status}
                                onChange={(v) => setDraft((d) => ({ ...d, status: v as Status | undefined }))}
                            />
                        </SearchField>
                        <SearchField label="性别">
                            <DictSelect
                                dictCode="sys_user_gender"
                                placeholder="全部"
                                value={draft.gender}
                                onChange={(v) => setDraft((d) => ({ ...d, gender: v as Gender | undefined }))}
                            />
                        </SearchField>
                        <SearchField label="创建时间">
                            <DatePicker
                                type="dateRange"
                                value={draft.createdRange ?? []}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        createdRange: Array.isArray(v) && v.length ? (v as Date[]) : undefined,
                                    }))
                                }
                            />
                        </SearchField>
                        <SearchField label="最后登录时间">
                            <DatePicker
                                type="dateRange"
                                value={draft.lastLoginRange ?? []}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        lastLoginRange: Array.isArray(v) && v.length ? (v as Date[]) : undefined,
                                    }))
                                }
                            />
                        </SearchField>
                    </>
                }
            >
                <Input
                    placeholder="用户名 / 昵称 / 手机"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((d) => ({ ...d, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 240 }}
                />
                <DictSelect
                    dictCode="sys_common_status"
                    placeholder="状态"
                    value={draft.status}
                    onChange={(v) => setDraft((d) => ({ ...d, status: v as Status | undefined }))}
                />
            </SearchToolbar>
            <Table<UserView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns, ROLE_MIN_WIDTH) }}
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
            {editing !== undefined && <UserFormModal record={editing} onClose={() => setEditing(undefined)} />}
            {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
            {identityOf && <UserIdentitiesModal user={identityOf} onClose={() => setIdentityOf(null)} />}
            {settingAccountOf && (
                <SetUserAccountFieldModal user={settingAccountOf} onClose={() => setSettingAccountOf(null)} />
            )}
        </PageContainer>
    );
}
