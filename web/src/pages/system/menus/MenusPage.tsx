import { Button, Popconfirm, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useDeleteMenu, useMenuTree } from '@/hooks/queries/menus';
import { usePermission } from '@/hooks/usePermission';
import type { MenuNode, MenuType, Status } from '@/types/api';
import { renderIcon } from '@/utils/icons';
import { flattenTree, pruneEmptyChildren } from '@/utils/menu';
import { MenuFormModal, type MenuFormTarget } from './MenuFormModal';

const TYPE_TAG: Record<MenuType, { text: string; color: 'blue' | 'green' | 'orange' }> = {
    directory: { text: '目录', color: 'blue' },
    menu: { text: '菜单', color: 'green' },
    button: { text: '按钮', color: 'orange' },
};

export default function MenusPage() {
    const { hasAnyPermission } = usePermission();
    const { data, isFetching } = useMenuTree();
    const deleteMenu = useDeleteMenu();
    const [target, setTarget] = useState<MenuFormTarget | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<(string | number)[] | null>(null);

    const tree = useMemo(() => pruneEmptyChildren(data ?? []), [data]);
    // 默认展开目录与菜单两级，按钮行收起
    const defaultExpanded = useMemo(
        () => flattenTree(tree).filter((m) => m.type === 'directory').map((m) => m.id),
        [tree],
    );

    const columns: ColumnProps<MenuNode>[] = [
        {
            title: '菜单名称',
            dataIndex: 'title',
            width: 200,
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
        { title: '路由路径', dataIndex: 'path', width: 150, render: (v: string | null) => v || '—' },
        { title: '组件', dataIndex: 'component', render: (v: string | null) => v || '—' },
        { title: '权限码', dataIndex: 'permission', width: 160, render: (v: string | null) => v || '—' },
        { title: '排序', dataIndex: 'sort', width: 60 },
        {
            title: '显示',
            dataIndex: 'visible',
            width: 64,
            render: (v: boolean, r: MenuNode) => (r.type === 'button' ? '—' : v ? '是' : '否'),
        },
        { title: '状态', dataIndex: 'status', width: 72, render: (v: Status) => <StatusTag value={v} /> },
    ];

    if (hasAnyPermission('system:menu:create', 'system:menu:update', 'system:menu:delete')) {
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            fixed: 'right',
            width: 180,
            render: (_: unknown, record: MenuNode) => (
                <Space spacing={4}>
                    {record.type !== 'button' && (
                        <Permission code="system:menu:create">
                            <Button theme="borderless" size="small" onClick={() => setTarget({ mode: 'create', parent: record })}>
                                新增子项
                            </Button>
                        </Permission>
                    )}
                    <Permission code="system:menu:update">
                        <Button theme="borderless" size="small" onClick={() => setTarget({ mode: 'edit', record })}>
                            编辑
                        </Button>
                    </Permission>
                    <Permission code="system:menu:delete">
                        <Popconfirm
                            title="确定删除该菜单？"
                            content="有子节点时不能删除；删除会同时解除角色授权"
                            onConfirm={() => deleteMenu.mutate(record.id, { onSuccess: () => Toast.success('已删除') })}
                        >
                            <Button theme="borderless" type="danger" size="small">
                                删除
                            </Button>
                        </Popconfirm>
                    </Permission>
                </Space>
            ),
        });
    }

    return (
        <PageContainer>
            <SearchToolbar
                actions={
                    <>
                        <Button onClick={() => setExpandedKeys(flattenTree(tree).map((m) => m.id))}>全部展开</Button>
                        <Button onClick={() => setExpandedKeys([])}>全部收起</Button>
                        <Permission code="system:menu:create">
                            <Button type="primary" theme="solid" icon={<Plus size={14} />} onClick={() => setTarget({ mode: 'create', parent: null })}>
                                新增菜单
                            </Button>
                        </Permission>
                    </>
                }
            />
            <Table<MenuNode>
                rowKey="id"
                columns={columns}
                dataSource={tree}
                loading={isFetching}
                pagination={false}
                expandedRowKeys={expandedKeys ?? defaultExpanded}
                onExpandedRowsChange={(rows) => setExpandedKeys((rows ?? []).map((r) => (r as MenuNode).id))}
                scroll={{ x: 1110 }}
            />
            {target && <MenuFormModal target={target} tree={data ?? []} onClose={() => setTarget(null)} />}
        </PageContainer>
    );
}
