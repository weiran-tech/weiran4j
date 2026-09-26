import { TreeSelect } from '@douyinfe/semi-ui';
import type { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { useMemo, type CSSProperties } from 'react';
import { useDepartmentTree } from '@/hooks/queries/departments';
import type { DepartmentNode } from '@/types/api';

/** 部门树 → Semi TreeSelect 数据；disabledIds 里的节点禁选（编辑时排除自己与后代） */
export function toDepartmentTreeData(nodes: readonly DepartmentNode[], disabledIds?: ReadonlySet<number>): TreeNodeData[] {
    return nodes.map((n) => ({
        key: String(n.id),
        value: n.id,
        label: n.name,
        disabled: disabledIds?.has(n.id) ?? false,
        ...(n.children?.length ? { children: toDepartmentTreeData(n.children, disabledIds) } : {}),
    }));
}

/** 表单里用：`<Form.TreeSelect treeData={useDepartmentTreeData()} />` */
export function useDepartmentTreeData(disabledIds?: ReadonlySet<number>) {
    const { data } = useDepartmentTree();
    return useMemo(() => toDepartmentTreeData(data ?? [], disabledIds), [data, disabledIds]);
}

interface DepartmentTreeSelectProps {
    value?: number | undefined;
    onChange?: (value: number | undefined) => void;
    placeholder?: string;
    style?: CSSProperties;
}

/** 部门树下拉（筛选栏用） */
export function DepartmentTreeSelect({ value, onChange, placeholder = '选择部门', style }: DepartmentTreeSelectProps) {
    const treeData = useDepartmentTreeData();
    return (
        <TreeSelect
            treeData={treeData}
            value={value}
            onChange={(v) => onChange?.(typeof v === 'number' ? v : undefined)}
            placeholder={placeholder}
            style={style ?? { width: 180 }}
            dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
            showClear
            filterTreeNode
            expandAll
        />
    );
}
