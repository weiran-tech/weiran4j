import { Button, SideSheet, Space, Spin, Tag, Toast, Tree } from '@douyinfe/semi-ui';
import type { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { useMemo, useState } from 'react';
import { useMenuTree } from '@/hooks/queries/menus';
import { useAssignRoleMenus, useRoleDetail } from '@/hooks/queries/roles';
import type { MenuNode, MenuType, RoleView } from '@/types/api';
import { applyMenuCheck, flattenTree } from '@/utils/menu';

const TYPE_LABEL: Record<MenuType, { text: string; color: 'blue' | 'green' | 'orange' }> = {
    directory: { text: '目录', color: 'blue' },
    menu: { text: '菜单', color: 'green' },
    button: { text: '按钮', color: 'orange' },
};

function toTreeData(nodes: readonly MenuNode[]): TreeNodeData[] {
    return nodes.map((n) => ({
        key: String(n.id),
        value: n.id,
        label: (
            <Space spacing={6}>
                <span>{n.title}</span>
                <Tag size="small" color={TYPE_LABEL[n.type].color}>
                    {TYPE_LABEL[n.type].text}
                </Tag>
                {n.permission && <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>{n.permission}</span>}
            </Space>
        ),
        ...(n.children?.length ? { children: toTreeData(n.children) } : {}),
    }));
}

interface Props {
    role: RoleView;
    onClose: () => void;
}

/** 分配菜单权限：全量菜单树勾选，保存时全量覆盖 */
export function RoleMenuSheet({ role, onClose }: Props) {
    const menuTree = useMenuTree();
    const detail = useRoleDetail(role.id);
    const assign = useAssignRoleMenus();
    /** null 表示还没改动，沿用后端返回的 menuIds */
    const [checked, setChecked] = useState<number[] | null>(null);

    const menus = useMemo(() => menuTree.data ?? [], [menuTree.data]);
    const treeData = useMemo(() => toTreeData(menus), [menus]);
    const allIds = useMemo(() => flattenTree(menus).map((m) => m.id), [menus]);
    const value = checked ?? detail.data?.menuIds ?? [];

    const save = async () => {
        await assign.mutateAsync({ id: role.id, menuIds: value });
        Toast.success('权限已保存');
        onClose();
    };

    const loading = menuTree.isPending || detail.isPending;

    return (
        <SideSheet
            visible
            title={`分配权限：${role.name}`}
            width={520}
            onCancel={onClose}
            footer={
                <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={assign.isPending} disabled={loading} onClick={() => void save().catch(() => undefined)}>
                        保存
                    </Button>
                </Space>
            }
        >
            {loading ? (
                <Spin />
            ) : (
                <>
                    <Space style={{ marginBottom: 8 }}>
                        <Button size="small" onClick={() => setChecked(allIds)}>
                            全选
                        </Button>
                        <Button size="small" onClick={() => setChecked([])}>
                            清空
                        </Button>
                        <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>已选 {value.length} 项</span>
                    </Space>
                    <Tree
                        treeData={treeData}
                        multiple
                        checkRelation="unRelated"
                        value={value}
                        onChange={(v) => {
                            const next = (Array.isArray(v) ? v : []).filter((x): x is number => typeof x === 'number');
                            setChecked(applyMenuCheck(menus, value, next));
                        }}
                        defaultExpandAll
                    />
                </>
            )}
        </SideSheet>
    );
}
