import { Button, Dropdown, Modal, Popconfirm, Space } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { MoreHorizontal } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { tableScrollX } from '@/hooks/useTableDefaults';
import { usePermission } from '@/hooks/usePermission';

export interface TableAction {
    key: string;
    label: string;
    onClick: () => void;
    /** 危险操作：红色文字 */
    danger?: boolean;
    disabled?: boolean;
    /** 需要二次确认：平铺时用 Popconfirm，收起到「更多」菜单里时用 Modal.confirm（菜单关闭后 Popconfirm 没有锚点） */
    confirm?: { title: string; content?: string };
    /** 按钮级权限码；无权限不渲染 */
    permission?: string;
}

/** 操作列收起后的宽度：一个「更多」按钮 + 单元格左右内边距 */
export const COMPACT_ACTIONS_WIDTH = 76;

/**
 * 表格操作列：平铺为文字按钮；`compact` 时收成一个「更多」按钮，点击弹出菜单列出全部操作，
 * 避免窄屏横向滚动时固定在右侧的操作列遮住数据。是否收起用同文件的 `useCompactActions` 判断。
 */
export function TableActions({ actions, compact = false }: { actions: readonly TableAction[]; compact?: boolean }) {
    const { hasPermission } = usePermission();
    const visible = actions.filter((a) => !a.permission || hasPermission(a.permission));
    if (!visible.length) return null;

    if (compact) {
        const run = (a: TableAction) => {
            if (!a.confirm) {
                a.onClick();
                return;
            }
            Modal.confirm({
                title: a.confirm.title,
                ...(a.confirm.content ? { content: a.confirm.content } : {}),
                okText: '确定',
                cancelText: '取消',
                ...(a.danger ? { okButtonProps: { type: 'danger' as const, theme: 'solid' as const } } : {}),
                onOk: a.onClick,
            });
        };
        return (
            <Dropdown
                trigger="click"
                position="bottomRight"
                clickToHide
                render={
                    <Dropdown.Menu>
                        {visible.map((a) => (
                            <Dropdown.Item
                                key={a.key}
                                {...(a.danger ? { type: 'danger' as const } : {})}
                                {...(a.disabled ? { disabled: true } : {})}
                                onClick={() => run(a)}
                            >
                                {a.label}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                }
            >
                <Button theme="borderless" size="small" icon={<MoreHorizontal size={14} />} aria-label="更多操作">
                    更多
                </Button>
            </Dropdown>
        );
    }

    return (
        <Space spacing={4}>
            {visible.map((a) => {
                const button = (
                    <Button
                        key={a.key}
                        theme="borderless"
                        size="small"
                        {...(a.danger ? { type: 'danger' as const } : {})}
                        {...(a.disabled ? { disabled: true } : {})}
                        {...(a.confirm ? {} : { onClick: a.onClick })}
                    >
                        {a.label}
                    </Button>
                );
                return a.confirm ? (
                    <Popconfirm
                        key={a.key}
                        title={a.confirm.title}
                        {...(a.confirm.content ? { content: a.confirm.content } : {})}
                        onConfirm={a.onClick}
                    >
                        {button}
                    </Popconfirm>
                ) : (
                    button
                );
            })}
        </Space>
    );
}

/**
 * 表格容器放不下全部列（宽度 < requiredWidth，即操作列平铺时的 scroll.x）时返回 compact=true。
 * 把返回的 ref 挂到表格外层块级容器上；容器宽度不随表格列宽变化，收起后不会反过来触发展开（无抖动）。
 * 没有 ResizeObserver 的环境（jsdom）恒为 false。
 */
export function useCompactActions(requiredWidth: number): [(el: HTMLElement | null) => void, boolean] {
    const [width, setWidth] = useState<number | null>(null);
    const observer = useRef<ResizeObserver | null>(null);
    const ref = useCallback((el: HTMLElement | null) => {
        observer.current?.disconnect();
        observer.current = null;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width;
            if (w !== undefined) setWidth(Math.floor(w));
        });
        ro.observe(el);
        observer.current = ro;
    }, []);
    return [ref, width !== null && width < requiredWidth];
}

/**
 * 列表页操作列的完整接法（约定见 `openspec/rules/advisory/list-view.md` 二.3）：
 * 在**应用列设置之后**的列里找到 `dataIndex: 'actions'` 那列，按它平铺时的宽度（`width`）算出所需总宽交给
 * `useCompactActions`，再把这一列换成 `TableActions`（放不下时收成「更多」、列宽改为 `COMPACT_ACTIONS_WIDTH`）。
 * 返回的 `ref` 挂在表格外层块级容器上；没有操作列（无权限）时原样返回。
 */
export function useActionsColumn<T extends object>(
    columns: ColumnProps<T>[],
    actionsOf: (record: T) => TableAction[],
    flexMin?: number,
): { ref: (el: HTMLElement | null) => void; columns: ColumnProps<T>[]; compact: boolean } {
    const [ref, compact] = useCompactActions(tableScrollX(columns, flexMin));
    const mapped = columns.map(
        (c): ColumnProps<T> =>
            c.dataIndex === 'actions'
                ? {
                      ...c,
                      ...(compact ? { width: COMPACT_ACTIONS_WIDTH } : {}),
                      render: (_: unknown, record: T) => <TableActions actions={actionsOf(record)} compact={compact} />,
                  }
                : c,
    );
    return { ref, columns: mapped, compact };
}
