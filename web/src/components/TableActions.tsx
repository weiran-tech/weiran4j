import { Button, Dropdown, Modal, Popconfirm, Space } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { MoreHorizontal } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { mediaDown } from '@/lib/breakpoints';
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

/** 操作列收起后的宽度：「…」图标按钮 24 + 左右内边距 24 = 48，取表头「操作」两字（26 + 24）不折行的 52 */
export const COMPACT_ACTIONS_WIDTH = 52;

/**
 * 表格操作列：平铺为文字按钮；`compact` 时收成一个「…」图标按钮（aria-label「更多操作」），点击弹出菜单列出全部操作。
 * 是否收起用同文件的 `useCompactActions`（与便捷搜索隐藏同一断点）。
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
                <Button theme="borderless" size="small" icon={<MoreHorizontal size={16} />} aria-label="更多操作" />
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
 * 操作列是否收成「…」：与「便捷搜索隐藏」同一断点（视口 < 992px，即 `mediaDown('lg')`，对应样式里的 `--lg-down`）。
 * 不按表格容器宽度判断：992px 以上即使表格需要横向滚动，操作列也保持平铺（固定在右侧）。
 */
export function useCompactActions(): boolean {
    return useMediaQuery(mediaDown('lg'));
}

/**
 * 列表页操作列的完整接法（约定见 `openspec/rules/advisory/list-view.md` 二.3）：
 * 把 `dataIndex: 'actions'` 那列换成 `TableActions`；窄屏（`useCompactActions`）时收成「…」、列宽改为 `COMPACT_ACTIONS_WIDTH`。
 * 传入列设置之后的列；没有操作列（无权限）时原样返回。
 */
export function useActionsColumn<T extends object>(
    columns: ColumnProps<T>[],
    actionsOf: (record: T) => TableAction[],
): { columns: ColumnProps<T>[]; compact: boolean } {
    const compact = useCompactActions();
    const mapped = columns.map((c): ColumnProps<T> =>
        c.dataIndex === 'actions'
            ? {
                  ...c,
                  ...(compact ? { width: COMPACT_ACTIONS_WIDTH } : {}),
                  render: (_: unknown, record: T) => <TableActions actions={actionsOf(record)} compact={compact} />,
              }
            : c,
    );
    return { columns: mapped, compact };
}
