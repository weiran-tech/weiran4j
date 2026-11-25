import { Cascader } from '@douyinfe/semi-ui';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useRegionLookup } from '@/hooks/queries/regions';
import type { RegionNode } from '@/types/api';

export interface RegionCascaderData {
    label: string;
    value: string;
    children?: RegionCascaderData[];
}

/** Convert the login lookup tree to Cascader options, dropping disabled nodes and their descendants. */
export function toRegionCascaderData(nodes: readonly RegionNode[]): RegionCascaderData[] {
    return nodes
        .filter((node) => node.status === 'enabled')
        .map((node) => {
            const children = toRegionCascaderData(node.children ?? []);
            return {
                label: node.name,
                value: node.code,
                ...(children.length ? { children } : {}),
            };
        });
}

interface RegionSelectProps {
    value?: string[] | undefined;
    onChange?: (value: string[] | undefined) => void;
    placeholder?: string;
    style?: CSSProperties;
    disabled?: boolean;
}

/** Login-only region cascader. Its controlled value is the selected province/city/county code path. */
export function RegionSelect({ value, onChange, placeholder = '选择省 / 市 / 县', style, disabled }: RegionSelectProps) {
    const { data, isLoading } = useRegionLookup();
    const treeData = useMemo(() => toRegionCascaderData(data ?? []), [data]);

    return (
        <Cascader
            treeData={treeData}
            value={value}
            onChange={(next) => {
                const path = Array.isArray(next) ? next.filter((part): part is string => typeof part === 'string') : [];
                onChange?.(path.length ? path : undefined);
            }}
            placeholder={placeholder}
            style={style ?? { width: '100%' }}
            dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
            disabled={disabled}
            loading={isLoading}
            showClear
            filterTreeNode
            changeOnSelect
        />
    );
}
