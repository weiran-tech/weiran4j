import { Button, Form, Modal, Table, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import type { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { useMemo, useRef, useState } from 'react';
import { toDepartmentTreeData } from '@/components/DepartmentTreeSelect';
import { DictSelect } from '@/components/DictSelect';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { STATUS_OPTIONS, StatusTag } from '@/components/StatusTag';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useDictOptions } from '@/hooks/queries/dicts';
import { useDeleteDepartment, useDepartmentTree, useSaveDepartment } from '@/hooks/queries/departments';
import { useUserOptions } from '@/hooks/queries/users';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { DepartmentNode, Status } from '@/types/api';
import { collectSubtreeIds, flattenTree, pruneEmptyChildren } from '@/utils/menu';

type Target = { mode: 'create'; parent: DepartmentNode | null } | { mode: 'edit'; record: DepartmentNode };

interface DepartmentForm {
    parentId: number;
    name: string;
    code: string;
    leaderId?: number;
    phone: string;
    sort: number;
    status: Status;
}

function DepartmentFormModal({ target, tree, onClose }: { target: Target; tree: DepartmentNode[]; onClose: () => void }) {
    const isEdit = target.mode === 'edit';
    const api = useRef<FormApi<DepartmentForm> | null>(null);
    const save = useSaveDepartment();
    const { data: users } = useUserOptions();

    const parentTree = useMemo(() => {
        const disabled = isEdit ? collectSubtreeIds(tree, target.record.id) : new Set<number>();
        return [{ key: '0', value: 0, label: '顶级', children: toDepartmentTreeData(tree, disabled) }] satisfies TreeNodeData[];
    }, [tree, target, isEdit]);

    const init: DepartmentForm =
        target.mode === 'edit'
            ? {
                  parentId: target.record.parentId,
                  name: target.record.name,
                  code: target.record.code,
                  ...(target.record.leaderId ? { leaderId: target.record.leaderId } : {}),
                  phone: target.record.phone ?? '',
                  sort: target.record.sort,
                  status: target.record.status,
              }
            : { parentId: target.parent?.id ?? 0, name: '', code: '', phone: '', sort: 0, status: 'enabled' };

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        await save.mutateAsync({
            id: isEdit ? target.record.id : undefined,
            body: {
                parentId: v.parentId ?? 0,
                name: v.name,
                code: v.code,
                leaderId: v.leaderId ?? null,
                phone: v.phone || null,
                sort: v.sort ?? 0,
                status: v.status,
            },
        });
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑部门' : '新增部门'}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<DepartmentForm>
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={init}
                labelPosition="left"
                labelWidth={90}
            >
                <Form.TreeSelect
                    field="parentId"
                    label="上级部门"
                    treeData={parentTree}
                    style={{ width: '100%' }}
                    expandAll
                    filterTreeNode
                />
                <Form.Input field="name" label="部门名称" maxLength={64} rules={[{ required: true, message: '请输入部门名称' }]} />
                <Form.Input field="code" label="部门编码" maxLength={64} rules={[{ required: true, message: '请输入部门编码' }]} />
                <Form.Select
                    field="leaderId"
                    label="负责人"
                    style={{ width: '100%' }}
                    showClear
                    filter
                    placeholder="选择负责人"
                    optionList={(users ?? []).map((u) => ({ label: `${u.nickname}（${u.username}）`, value: u.id }))}
                />
                <Form.Input field="phone" label="联系电话" maxLength={20} />
                <Form.InputNumber field="sort" label="排序" min={0} style={{ width: '100%' }} />
                <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} />
            </Form>
        </Modal>
    );
}

export default function DepartmentsPage() {
    const { tableProps } = useTableDefaults();
    const { hasAnyPermission } = usePermission();
    const [draftStatus, setDraftStatus] = useState<Status | undefined>(undefined);
    const [status, setStatus] = useState<Status | undefined>(undefined);
    const { data, isFetching, refetch } = useDepartmentTree(status);
    const deleteDepartment = useDeleteDepartment();
    const [target, setTarget] = useState<Target | null>(null);

    const tree = useMemo(() => pruneEmptyChildren(data ?? []), [data]);
    const allKeys = useMemo(() => flattenTree(tree).map((d) => d.id), [tree]);
    // 展开状态受控：null 表示全部展开（默认），「展开树状」按钮在全部展开与全部收起间切换
    const [expandedKeys, setExpandedKeys] = useState<number[] | null>(null);
    const allExpanded = expandedKeys === null || (allKeys.length > 0 && allKeys.every((k) => expandedKeys.includes(k)));
    const statusOptions = useDictOptions('sys_common_status');
    const conditions: SearchCondition[] = status
        ? [
              {
                  key: 'status',
                  label: '状态',
                  value: statusOptions.find((o) => o.value === status)?.label ?? status,
                  onRemove: () => {
                      setDraftStatus(undefined);
                      setStatus(undefined);
                  },
              },
          ]
        : [];

    const columns: ColumnProps<DepartmentNode>[] = [
        { title: '部门名称', dataIndex: 'name', width: 220 },
        { title: '部门编码', dataIndex: 'code', width: 120 },
        { title: '负责人', dataIndex: 'leaderName', width: 100, render: (v: string | null) => v || '—' },
        { title: '联系电话', dataIndex: 'phone', width: 120, render: (v: string | null) => v || '—' },
        { title: '排序', dataIndex: 'sort', width: 64 },
        { title: '状态', dataIndex: 'status', width: 72, render: (v: Status) => <StatusTag value={v} /> },
        { title: '创建时间', dataIndex: 'createdAt', width: 164 },
    ];

    const departmentActions = (record: DepartmentNode): TableAction[] => [
        {
            key: 'create-child',
            label: '新增下级',
            permission: 'system:department:create',
            onClick: () => setTarget({ mode: 'create', parent: record }),
        },
        { key: 'edit', label: '编辑', permission: 'system:department:update', onClick: () => setTarget({ mode: 'edit', record }) },
        {
            key: 'delete',
            label: '删除',
            permission: 'system:department:delete',
            danger: true,
            confirm: { title: '确定删除该部门？', content: '有下级部门或仍有用户时不能删除' },
            onClick: () => deleteDepartment.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];
    if (hasAnyPermission('system:department:create', 'system:department:update', 'system:department:delete')) {
        columns.push({ title: '操作', dataIndex: 'actions', fixed: 'right', width: 180 });
    }

    const { columns: settledColumns, columnSettings } = useColumnSettings('system/departments', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, departmentActions);

    return (
        <PageContainer>
            <SearchToolbar
                tools={columnSettings}
                onSearch={() => setStatus(draftStatus)}
                onReset={() => {
                    setDraftStatus(undefined);
                    setStatus(undefined);
                }}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                treeExpand={{ expanded: allExpanded, onToggle: () => setExpandedKeys(allExpanded ? [] : null) }}
                conditions={conditions}
                leading={
                    <Permission code="system:department:create">
                        <Button type="primary" theme="solid" onClick={() => setTarget({ mode: 'create', parent: null })}>
                            新增部门
                        </Button>
                    </Permission>
                }
            >
                <DictSelect
                    dictCode="sys_common_status"
                    placeholder="状态"
                    value={draftStatus}
                    onChange={(v) => setDraftStatus(v as Status | undefined)}
                />
            </SearchToolbar>
            <Table<DepartmentNode>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={tree}
                loading={isFetching}
                pagination={false}
                expandedRowKeys={expandedKeys ?? allKeys}
                onExpandedRowsChange={(rows) => setExpandedKeys((rows ?? []).map((r) => (r as DepartmentNode).id))}
                scroll={{ x: tableScrollX(tableColumns) }}
            />
            {target && <DepartmentFormModal target={target} tree={data ?? []} onClose={() => setTarget(null)} />}
        </PageContainer>
    );
}
