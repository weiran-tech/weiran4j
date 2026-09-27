import { Button, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useDeleteMenu, useMenuTree } from '@/hooks/queries/menus';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { MenuNode, MenuType, Status } from '@/types/api';
import { renderIcon } from '@/utils/icons';
import { flattenTree, pruneEmptyChildren } from '@/utils/menu';
import { MenuFormModal, type MenuFormTarget } from './MenuFormModal';

const TYPE_TAG: Record<MenuType, { text: string; color: 'blue' | 'green' | 'orange' }> = {
    directory: { text: '目录', color: 'blue' },
    menu: { text: '菜单', color: 'green' },
    button: { text: '按钮', color: 'orange' },
};

/** 组件路径（如 system/configs/ConfigsPage）作为唯一的弹性列，至少给这么宽 */
const COMPONENT_MIN_WIDTH = 180;

/** 路径 / 组件 / 权限码：单行省略 + 悬停看全文，不在单词中间折行 */
function codeText(v: string | null) {
    return v ? (
        <Typography.Text ellipsis={{ showTooltip: true }} style={{ width: '100%' }}>
            {v}
        </Typography.Text>
    ) : (
        '—'
    );
}

export default function MenusPage() {
    const { tableProps } = useTableDefaults();
    const { hasAnyPermission } = usePermission();
    const { data, isFetching, refetch } = useMenuTree();
    const deleteMenu = useDeleteMenu();
    const [target, setTarget] = useState<MenuFormTarget | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<(string | number)[] | null>(null);

    const tree = useMemo(() => pruneEmptyChildren(data ?? []), [data]);
    // 默认展开目录与菜单两级，按钮行收起
    const defaultExpanded = useMemo(
        () =>
            flattenTree(tree)
                .filter((m) => m.type === 'directory')
                .map((m) => m.id),
        [tree],
    );
    // 「展开树状」开关：只要有节点没展开就显示「全部展开」
    const allKeys = useMemo(
        () =>
            flattenTree(tree)
                .filter((m) => m.children?.length)
                .map((m) => m.id),
        [tree],
    );
    const currentExpanded = expandedKeys ?? defaultExpanded;
    const allExpanded = allKeys.length > 0 && allKeys.every((k) => currentExpanded.includes(k));

    const columns: ColumnProps<MenuNode>[] = [
        {
            title: '菜单名称',
            dataIndex: 'title',
            width: 180,
            render: (v: string, r: MenuNode) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {renderIcon(r.icon, 14)}
                    {v}
                </span>
            ),
        },
        {
            title: '类型',
            dataIndex: 'type',
            width: 72,
            render: (v: MenuType) => (
                <Tag size="small" color={TYPE_TAG[v].color}>
                    {TYPE_TAG[v].text}
                </Tag>
            ),
        },
        { title: '路由路径', dataIndex: 'path', width: 140, render: codeText },
        { title: '组件', dataIndex: 'component', render: codeText },
        { title: '权限码', dataIndex: 'permission', width: 150, render: codeText },
        { title: '排序', dataIndex: 'sort', width: 60 },
        {
            title: '显示',
            dataIndex: 'visible',
            width: 64,
            render: (v: boolean, r: MenuNode) => (r.type === 'button' ? '—' : v ? '是' : '否'),
        },
        { title: '状态', dataIndex: 'status', width: 72, render: (v: Status) => <StatusTag value={v} /> },
    ];

    const menuActions = (record: MenuNode): TableAction[] => [
        ...(record.type !== 'button'
            ? [
                  {
                      key: 'create-child',
                      label: '新增子项',
                      permission: 'system:menu:create',
                      onClick: () => setTarget({ mode: 'create', parent: record }),
                  },
              ]
            : []),
        { key: 'edit', label: '编辑', permission: 'system:menu:update', onClick: () => setTarget({ mode: 'edit', record }) },
        {
            key: 'delete',
            label: '删除',
            permission: 'system:menu:delete',
            danger: true,
            confirm: { title: '确定删除该菜单？', content: '有子节点时不能删除；删除会同时解除角色授权' },
            onClick: () => deleteMenu.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];
    if (hasAnyPermission('system:menu:create', 'system:menu:update', 'system:menu:delete')) {
        columns.push({ title: '操作', dataIndex: 'actions', fixed: 'right', width: 180 });
    }

    const { columns: settledColumns, columnSettings } = useColumnSettings('system/menus', columns);
    const { ref: tableBoxRef, columns: tableColumns } = useActionsColumn(settledColumns, menuActions, COMPONENT_MIN_WIDTH);

    return (
        <PageContainer>
            <SearchToolbar
                tools={columnSettings}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                treeExpand={{ expanded: allExpanded, onToggle: () => setExpandedKeys(allExpanded ? [] : allKeys) }}
                leading={
                    <Permission code="system:menu:create">
                        <Button
                            type="primary"
                            theme="solid"
                            icon={<Plus size={14} />}
                            onClick={() => setTarget({ mode: 'create', parent: null })}
                        >
                            新增菜单
                        </Button>
                    </Permission>
                }
            />
            <div ref={tableBoxRef}>
                <Table<MenuNode>
                    {...tableProps}
                    rowKey="id"
                    columns={tableColumns}
                    scroll={{ x: tableScrollX(tableColumns, COMPONENT_MIN_WIDTH) }}
                    dataSource={tree}
                    loading={isFetching}
                    pagination={false}
                    expandedRowKeys={expandedKeys ?? defaultExpanded}
                    onExpandedRowsChange={(rows) => setExpandedKeys((rows ?? []).map((r) => (r as MenuNode).id))}
                />
            </div>
            {target && <MenuFormModal target={target} tree={data ?? []} onClose={() => setTarget(null)} />}
        </PageContainer>
    );
}
