import { Form, Modal, Toast, withField } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { useMemo, useRef } from 'react';
import { IconPicker } from '@/components/IconPicker';
import { STATUS_OPTIONS } from '@/components/StatusTag';
import { useSaveMenu } from '@/hooks/queries/menus';
import type { MenuNode, MenuSaveRequest, MenuType, Status } from '@/types/api';
import { collectSubtreeIds } from '@/utils/menu';

const FormIconPicker = withField(IconPicker);

export type MenuFormTarget = { mode: 'create'; parent: MenuNode | null } | { mode: 'edit'; record: MenuNode };

interface MenuForm {
    parentId: number;
    type: MenuType;
    title: string;
    icon: string;
    path: string;
    component: string;
    permission: string;
    sort: number;
    visible: boolean;
    keepAlive: boolean;
    isExternal: boolean;
    status: Status;
}

const TYPE_OPTIONS = [
    { label: '目录', value: 'directory' },
    { label: '菜单', value: 'menu' },
    { label: '按钮', value: 'button' },
];

/** 上级菜单选项：只能挂在目录/菜单下；编辑时禁选自己与后代 */
function toParentTree(nodes: readonly MenuNode[], disabled: ReadonlySet<number>): TreeNodeData[] {
    return nodes
        .filter((n) => n.type !== 'button')
        .map((n) => {
            const children = toParentTree(n.children ?? [], disabled);
            return {
                key: String(n.id),
                value: n.id,
                label: n.title,
                disabled: disabled.has(n.id),
                ...(children.length ? { children } : {}),
            };
        });
}

function initValues(target: MenuFormTarget): MenuForm {
    if (target.mode === 'edit') {
        const r = target.record;
        return {
            parentId: r.parentId,
            type: r.type,
            title: r.title,
            icon: r.icon ?? '',
            path: r.path ?? '',
            component: r.component ?? '',
            permission: r.permission ?? '',
            sort: r.sort,
            visible: r.visible,
            keepAlive: r.keepAlive,
            isExternal: r.isExternal,
            status: r.status,
        };
    }
    const parent = target.parent;
    return {
        parentId: parent?.id ?? 0,
        // 在菜单下新增，默认是按钮；在目录或根下新增，默认是菜单
        type: parent?.type === 'menu' ? 'button' : 'menu',
        title: '',
        icon: '',
        path: parent?.path && parent.type === 'directory' ? `${parent.path.replace(/\/$/, '')}/` : '',
        component: '',
        permission: '',
        sort: 0,
        visible: true,
        keepAlive: false,
        isExternal: false,
        status: 'enabled',
    };
}

function toRequest(v: MenuForm): MenuSaveRequest {
    const base: MenuSaveRequest = {
        parentId: v.parentId ?? 0,
        title: v.title,
        type: v.type,
        sort: v.sort ?? 0,
        status: v.status,
        permission: v.permission?.trim() || null,
    };
    if (v.type === 'button') {
        return { ...base, path: null, component: null, icon: null, visible: true, keepAlive: false, isExternal: false };
    }
    return {
        ...base,
        icon: v.icon || null,
        path: v.path?.trim() || null,
        component: v.type === 'menu' && !v.isExternal ? v.component?.trim() || null : null,
        visible: v.visible,
        keepAlive: v.type === 'menu' ? v.keepAlive : false,
        isExternal: v.type === 'menu' ? v.isExternal : false,
    };
}

interface Props {
    target: MenuFormTarget;
    tree: MenuNode[];
    onClose: () => void;
}

export function MenuFormModal({ target, tree, onClose }: Props) {
    const isEdit = target.mode === 'edit';
    const api = useRef<FormApi<MenuForm> | null>(null);
    const save = useSaveMenu();

    const parentTree = useMemo(() => {
        const disabled = isEdit ? collectSubtreeIds(tree, target.record.id) : new Set<number>();
        return [{ key: '0', value: 0, label: '顶级', children: toParentTree(tree, disabled) }] satisfies TreeNodeData[];
    }, [tree, target, isEdit]);

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        await save.mutateAsync({ id: isEdit ? target.record.id : undefined, body: toRequest(v) });
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑菜单' : '新增菜单'}
            width={640}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<MenuForm>
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={initValues(target)}
                labelPosition="left"
                labelWidth={90}
            >
                {({ values }) => {
                    const type = values.type;
                    const external = type === 'menu' && values.isExternal;
                    return (
                        <>
                            <Form.TreeSelect
                                field="parentId"
                                label="上级"
                                treeData={parentTree}
                                style={{ width: '100%' }}
                                expandAll
                                filterTreeNode
                            />
                            <Form.RadioGroup field="type" label="类型" options={TYPE_OPTIONS} type="button" />
                            <Form.Input field="title" label="名称" maxLength={64} rules={[{ required: true, message: '请输入名称' }]} />
                            {type !== 'button' && <FormIconPicker field="icon" label="图标" />}
                            {type !== 'button' && (
                                <Form.Input
                                    field="path"
                                    label={external ? '外链地址' : '路由路径'}
                                    maxLength={256}
                                    placeholder={external ? 'https://…' : '/system/users'}
                                    rules={type === 'menu' ? [{ required: true, message: '菜单必须填写路径' }] : []}
                                />
                            )}
                            {type === 'menu' && !external && (
                                <Form.Input
                                    field="component"
                                    label="组件"
                                    maxLength={256}
                                    placeholder="相对 src/pages，无 .tsx，如 system/users/UsersPage"
                                />
                            )}
                            {type !== 'directory' && (
                                <Form.Input
                                    field="permission"
                                    label="权限码"
                                    maxLength={128}
                                    placeholder="如 system:user:create"
                                    rules={type === 'button' ? [{ required: true, message: '按钮必须填写权限码' }] : []}
                                />
                            )}
                            <Form.InputNumber field="sort" label="排序" min={0} style={{ width: '100%' }} />
                            {type !== 'button' && <Form.Switch field="visible" label="显示" />}
                            {type === 'menu' && <Form.Switch field="isExternal" label="外链" />}
                            {type === 'menu' && !external && <Form.Switch field="keepAlive" label="缓存" />}
                            <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} />
                        </>
                    );
                }}
            </Form>
        </Modal>
    );
}
