import { EditConflictFeedback } from '@/components/EditConflictFeedback';
import { useEditConflict } from '@/hooks/useEditConflict';
import { useFormCloseGuard } from '@/hooks/useFormCloseGuard';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { RoleDetail } from '@/types/api';
import { Button, SideSheet, Space, Spin, Tag, Toast, Tree } from '@douyinfe/semi-ui';
import type { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { useEffect, useMemo, useState, useRef } from 'react';
import { queriesReady, QueryReadiness } from '@/components/QueryReadiness';
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
    const conflict = useEditConflict();
    const [baseline, setBaseline] = useState<RoleDetail | null>(null);
    const snapshot = baseline ?? detail.data;
    /** null 表示还没改动，沿用后端返回的 menuIds */
    const [checked, setChecked] = useState<number[] | null>(null);

    const menus = useMemo(() => menuTree.data ?? [], [menuTree.data]);
    const treeData = useMemo(() => toTreeData(menus), [menus]);
    const allIds = useMemo(() => flattenTree(menus).map((m) => m.id), [menus]);
    const value = useMemo(() => checked?.filter((id) => allIds.includes(id)) ?? snapshot?.menuIds ?? [], [checked, allIds, snapshot]);
    const ready = queriesReady(menuTree, detail) && !!snapshot && !assign.isPending && !conflict.conflict && !conflict.reloading;

    const fakeApi = useRef<FormApi<{ menuIds: number[] }> | null>(null);
    useEffect(() => { fakeApi.current = { getValues: () => ({ menuIds: value }), getInitValues: () => ({ menuIds: snapshot?.menuIds ?? [] }) } as FormApi<{ menuIds: number[] }>; }, [value, snapshot]);
    const guard = useFormCloseGuard(fakeApi, onClose);
    const reload = () => conflict.reload(async () => {
        const result = await detail.refetch();
        if (!result.isSuccess || result.isRefetchError) throw new Error('reload failed');
        setBaseline(result.data); setChecked(null);
    });
    const save = async () => {
        if (!ready || !snapshot) return;
        await conflict.run(() => assign.mutateAsync({ id: role.id, menuIds: value, version: snapshot.version }));
        Toast.success('权限已保存');
        onClose();
    };

    const loading = menuTree.isPending || detail.isPending;

    return (
        <SideSheet
            visible
            title={`分配权限：${role.name}`}
            width={520}
            onCancel={guard.requestClose}
            closable={!guard.saving} closeOnEsc={!guard.saving} maskClosable={false}
            footer={
                <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button disabled={guard.saving} onClick={guard.requestClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={assign.isPending} disabled={!ready} onClick={() => void guard.submit(save).catch(() => undefined)}>
                        保存
                    </Button>
                </Space>
            }
        >
            <EditConflictFeedback {...conflict} onReload={reload} />
            <QueryReadiness query={menuTree} label="菜单树" onRetry={() => void menuTree.refetch()} />
            <QueryReadiness query={detail} label="角色详情" onRetry={() => void detail.refetch()} />
            {loading ? (
                <Spin />
            ) : (
                <>
                    <Space style={{ marginBottom: 8 }}>
                        <Button size="small" disabled={!ready} onClick={() => { if (snapshot) setBaseline(snapshot); setChecked(allIds); }}>
                            全选
                        </Button>
                        <Button size="small" disabled={!ready} onClick={() => { if (snapshot) setBaseline(snapshot); setChecked([]); }}>
                            清空
                        </Button>
                        <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>已选 {value.length} 项</span>
                    </Space>
                    <Tree
                        disabled={!ready}
                        treeData={treeData}
                        multiple
                        checkRelation="unRelated"
                        value={value}
                        onChange={(v) => {
                            if (!ready) return;
                            const next = (Array.isArray(v) ? v : []).filter((x): x is number => typeof x === 'number');
                            if (snapshot) setBaseline(snapshot);
                            setChecked(applyMenuCheck(menus, value, next));
                        }}
                        defaultExpandAll
                    />
                </>
            )}
        </SideSheet>
    );
}
