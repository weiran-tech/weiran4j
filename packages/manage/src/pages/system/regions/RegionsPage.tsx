import { Button, Input, Select, Space, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { STATUS_OPTIONS, StatusTag } from '@/components/StatusTag';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useDeleteRegion, useRegionTree, useSaveRegion, downloadRegionCsv } from '@/hooks/queries/regions';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { RegionLevel, RegionNode, RegionQuery, RegionSaveRequest, Status } from '@/types/api';
import { flattenTree, pruneEmptyChildren } from '@/utils/menu';
import { RegionFormModal } from './RegionFormModal';

type Target = { mode: 'create'; parent: RegionNode | null } | { mode: 'edit'; record: RegionNode };

interface Filters {
    keyword: string;
    level: RegionLevel | undefined;
    status: Status | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', level: undefined, status: undefined };
const LEVEL_OPTIONS = [
    { label: '省级', value: 'province' },
    { label: '市级', value: 'city' },
    { label: '县级', value: 'county' },
];
const LEVEL_LABEL: Record<RegionLevel, string> = { province: '省级', city: '市级', county: '县级' };

function toQuery(filters: Filters): RegionQuery {
    return {
        ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        ...(filters.status ? { status: filters.status } : {}),
    };
}

function sortRegionTree(nodes: readonly RegionNode[]): RegionNode[] {
    return pruneEmptyChildren(nodes)
        .map((node) => ({ ...node, children: sortRegionTree(node.children ?? []) }))
        .sort((first, second) => second.id - first.id);
}

function nextLevel(level: RegionLevel): RegionLevel | null {
    if (level === 'province') return 'city';
    if (level === 'city') return 'county';
    return null;
}

export default function RegionsPage() {
    const { tableProps } = useTableDefaults();
    const { hasAnyPermission } = usePermission();
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [target, setTarget] = useState<Target | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
    const appliedQuery = toQuery(filters);
    const { data, isFetching, refetch } = useRegionTree(appliedQuery);
    const saveRegion = useSaveRegion();
    const deleteRegion = useDeleteRegion();
    const tree = useMemo(() => sortRegionTree(data ?? []), [data]);
    const expandableKeys = useMemo(
        () => flattenTree(tree).filter((node) => node.children.length > 0).map((node) => node.id),
        [tree],
    );
    const depthById = useMemo(() => {
        const depths = new Map<number, number>();
        const visit = (nodes: readonly RegionNode[], depth: number) => {
            for (const node of nodes) {
                depths.set(node.id, depth);
                visit(node.children, depth + 1);
            }
        };
        visit(tree, 0);
        return depths;
    }, [tree]);
    const allExpanded = expandableKeys.length > 0 && expandableKeys.every((id) => expandedKeys.includes(id));

    const search = () => {
        setFilters(draft);
        setExpandedKeys([]);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setExpandedKeys([]);
    };
    const removeFilter = (field: keyof Filters) => () => {
        const nextDraft = { ...draft, [field]: EMPTY_FILTERS[field] };
        setDraft(nextDraft);
        setFilters((current) => ({ ...current, [field]: EMPTY_FILTERS[field] }));
        setExpandedKeys([]);
    };
    const conditions: SearchCondition[] = [
        ...(filters.keyword.trim()
            ? [{ key: 'keyword', label: '关键字', value: filters.keyword.trim(), onRemove: removeFilter('keyword') }]
            : []),
        ...(filters.level
            ? [{ key: 'level', label: '级别', value: LEVEL_LABEL[filters.level], onRemove: removeFilter('level') }]
            : []),
        ...(filters.status
            ? [
                  {
                      key: 'status',
                      label: '状态',
                      value: filters.status === 'enabled' ? '启用' : '禁用',
                      onRemove: removeFilter('status'),
                  },
              ]
            : []),
    ];

    const columns: ColumnProps<RegionNode>[] = [
        { title: 'ID', dataIndex: 'id', width: 180, useFullRender: true },
        {
            title: '地区名称',
            dataIndex: 'name',
            render: (name: string, record: RegionNode) => {
                const expandable = record.children.length > 0;
                const expanded = expandedKeys.includes(record.id);
                const ToggleIcon = expanded ? ChevronDown : ChevronRight;
                return (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            paddingInlineStart: (depthById.get(record.id) ?? 0) * 20,
                        }}
                    >
                        {expandable ? (
                            <button
                                type="button"
                                aria-label={`${expanded ? '收起' : '展开'}${record.name}`}
                                onClick={() =>
                                    setExpandedKeys((keys) =>
                                        expanded ? keys.filter((id) => id !== record.id) : [...keys, record.id],
                                    )
                                }
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 20,
                                    height: 24,
                                    padding: 0,
                                    border: 0,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <ToggleIcon size={14} />
                            </button>
                        ) : (
                            <span aria-hidden="true" style={{ display: 'inline-block', width: 20 }} />
                        )}
                        <span>{name}</span>
                    </span>
                );
            },
        },
        { title: '区划代码', dataIndex: 'code', width: 140 },
        { title: '级别', dataIndex: 'level', width: 80, render: (value: RegionLevel) => LEVEL_LABEL[value] },
        { title: '上级代码', dataIndex: 'parentCode', width: 140, render: (value: string | null) => value || '—' },
        { title: '排序', dataIndex: 'sort', width: 72 },
        { title: '状态', dataIndex: 'status', width: 72, render: (value: Status) => <StatusTag value={value} /> },
        { title: '创建时间', dataIndex: 'createdAt', width: 164 },
    ];

    const regionActions = (record: RegionNode): TableAction[] => [
        ...(nextLevel(record.level)
            ? [
                  {
                      key: 'create-child',
                      label: '新增下级',
                      permission: 'region:create',
                      onClick: () => setTarget({ mode: 'create', parent: record }),
                  },
              ]
            : []),
        { key: 'edit', label: '编辑', permission: 'region:update', onClick: () => setTarget({ mode: 'edit', record }) },
        {
            key: record.status === 'enabled' ? 'disable' : 'enable',
            label: record.status === 'enabled' ? '停用' : '启用',
            permission: 'region:update',
            onClick: () => {
                const body: RegionSaveRequest = {
                    code: record.code,
                    name: record.name,
                    level: record.level,
                    parentCode: record.parentCode,
                    sort: record.sort,
                    status: record.status === 'enabled' ? 'disabled' : 'enabled',
                };
                saveRegion.mutate(
                    { id: record.id, body },
                    { onSuccess: () => Toast.success(record.status === 'enabled' ? '已停用' : '已启用') },
                );
            },
        },
        {
            key: 'delete',
            label: '删除',
            permission: 'region:delete',
            danger: true,
            disabled: record.children.length > 0,
            confirm: { title: '确定删除该地区？', content: '存在下级地区时不能删除' },
            onClick: () => deleteRegion.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];
    if (hasAnyPermission('region:update', 'region:delete', 'region:create')) {
        columns.push({ title: '操作', dataIndex: 'actions', fixed: 'right', width: 260 });
    }

    const { columns: settledColumns, columnSettings } = useColumnSettings('system/regions', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, regionActions);

    return (
        <PageContainer>
            <SearchToolbar
                tools={
                    <>
                        {columnSettings}
                        <Permission code="region:export">
                            <Button
                                type="tertiary"
                                icon={<Download size={14} />}
                                aria-label="导出 CSV"
                                onClick={() => void downloadRegionCsv(appliedQuery).catch(() => undefined)}
                            />
                        </Permission>
                    </>
                }
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                treeExpand={{
                    expanded: allExpanded,
                    onToggle: () => setExpandedKeys(allExpanded ? [] : expandableKeys),
                }}
                conditions={conditions}
                leading={
                    <Permission code="region:create">
                        <Button type="primary" theme="solid" onClick={() => setTarget({ mode: 'create', parent: null })}>
                            新增地区
                        </Button>
                    </Permission>
                }
            >
                <Space spacing={8}>
                    <Input
                        placeholder="地区名称 / 区划代码"
                        value={draft.keyword}
                        onChange={(keyword) => setDraft((current) => ({ ...current, keyword }))}
                        onEnterPress={search}
                        showClear
                        style={{ width: 220 }}
                    />
                    <Select
                        value={draft.level}
                        onChange={(level) => setDraft((current) => ({ ...current, level: level as RegionLevel | undefined }))}
                        optionList={LEVEL_OPTIONS}
                        placeholder="级别"
                        showClear
                        style={{ width: 120 }}
                    />
                    <Select
                        value={draft.status}
                        onChange={(status) => setDraft((current) => ({ ...current, status: status as Status | undefined }))}
                        optionList={STATUS_OPTIONS}
                        placeholder="状态"
                        showClear
                        style={{ width: 120 }}
                    />
                </Space>
            </SearchToolbar>
            <Table<RegionNode>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={tree}
                loading={isFetching}
                pagination={false}
                hideExpandedColumn
                expandedRowKeys={expandedKeys}
                onExpandedRowsChange={(rows) => setExpandedKeys((rows ?? []).map((row) => (row as RegionNode).id))}
                scroll={{ x: tableScrollX(tableColumns) }}
            />
            {target && <RegionFormModal target={target} tree={data ?? []} onClose={() => setTarget(null)} />}
        </PageContainer>
    );
}
