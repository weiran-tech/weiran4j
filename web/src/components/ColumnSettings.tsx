import { Button, Checkbox, Popover, Tooltip } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { GripVertical, Settings } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { usePreferences } from '@/hooks/usePreferences';
import './ColumnSettings.css';

/** 每个页面一条：`localStorage['weiran_table_columns:<tableKey>']` */
export const COLUMN_SETTINGS_PREFIX = 'weiran_table_columns:';

/** 用户对某张表的列设置：顺序（列 key）与隐藏的列 */
export interface ColumnState {
    order: string[];
    hidden: string[];
}

const EMPTY: ColumnState = { order: [], hidden: [] };

/** 列的稳定标识：dataIndex，其次 key；都没有的列不参与设置 */
export function columnKey(col: ColumnProps<never>): string | null {
    const k = col.dataIndex ?? col.key;
    return k === undefined || k === null ? null : String(k);
}

export function readColumnState(tableKey: string): ColumnState {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(COLUMN_SETTINGS_PREFIX + tableKey) ?? 'null');
        if (typeof parsed !== 'object' || parsed === null) return EMPTY;
        const { order, hidden } = parsed as Partial<ColumnState>;
        const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
        return { order: strings(order), hidden: strings(hidden) };
    } catch {
        return EMPTY;
    }
}

function writeColumnState(tableKey: string, state: ColumnState) {
    try {
        if (state.order.length === 0 && state.hidden.length === 0) localStorage.removeItem(COLUMN_SETTINGS_PREFIX + tableKey);
        else localStorage.setItem(COLUMN_SETTINGS_PREFIX + tableKey, JSON.stringify(state));
    } catch {
        // 隐私模式下写不进去：本次会话内仍然生效
    }
}

/** 参与设置的列：有 key、不是固定列、不是「操作」列 */
function configurableKey(col: ColumnProps<never>): string | null {
    const k = columnKey(col);
    return k === null || col.fixed || k === 'actions' ? null : k;
}

/** 参与设置的列按保存的顺序排好；保存里没有的新列按原顺序接在后面 */
function orderedKeys(configurable: string[], order: string[]): string[] {
    const known = order.filter((k) => configurable.includes(k));
    return [...known, ...configurable.filter((k) => !known.includes(k))];
}

/**
 * 应用列设置：隐藏的列去掉，可设置的列按保存顺序重排。
 * 固定列（`fixed`）、「操作」列（dataIndex `actions`）与没有 key 的列不参与，保持原位置。
 */
export function applyColumnState<T extends object>(columns: ColumnProps<T>[], state: ColumnState): ColumnProps<T>[] {
    const byKey = new Map<string, ColumnProps<T>>();
    for (const col of columns) {
        const k = configurableKey(col);
        if (k !== null) byKey.set(k, col);
    }
    const sorted = orderedKeys([...byKey.keys()], state.order).map((k) => byKey.get(k));
    let i = 0;
    return columns
        .map((col) => (configurableKey(col as ColumnProps<never>) !== null ? sorted[i++] : col))
        .filter((col): col is ColumnProps<T> => {
            if (!col) return false;
            const k = configurableKey(col);
            return k === null || !state.hidden.includes(k);
        });
}

interface ColumnSettingsProps {
    /** 可设置的列：key 与标题，按当前顺序 */
    columns: { key: string; title: string }[];
    hidden: string[];
    onChange: (state: ColumnState) => void;
    onReset: () => void;
}

/** 把 keys 中 from 位置的项移到 to 位置（拖放 / 键盘排序共用）；越界或原地返回原数组 */
export function reorderKeys(keys: readonly string[], from: number, to: number): string[] {
    if (from === to || from < 0 || to < 0 || from >= keys.length || to >= keys.length) return [...keys];
    const next = [...keys];
    const [item] = next.splice(from, 1);
    if (item !== undefined) next.splice(to, 0, item);
    return next;
}

/**
 * 列设置按钮（齿轮）+ 弹层：勾选显隐、拖放调整顺序、恢复默认；至少保留一列。
 * 排序用原生拖放：拖动每行左侧的把手到目标行松开；把手本身是可聚焦的按钮，键盘聚焦后 ↑ / ↓ 同样移动（不能只靠鼠标）。
 */
export function ColumnSettings({ columns, hidden, onChange, onReset }: ColumnSettingsProps) {
    const keys = columns.map((c) => c.key);
    const visibleCount = keys.filter((k) => !hidden.includes(k)).length;
    const [dragging, setDragging] = useState<string | null>(null);
    const [over, setOver] = useState<string | null>(null);
    const moveTo = (from: number, to: number) => onChange({ order: reorderKeys(keys, from, to), hidden });
    const endDrag = () => {
        setDragging(null);
        setOver(null);
    };
    const content = (
        <div className="column-settings" aria-label="列设置">
            <div className="column-settings__header">
                <span>列设置</span>
                <Button size="small" theme="borderless" type="tertiary" onClick={onReset}>
                    恢复默认
                </Button>
            </div>
            <ul className="column-settings__list">
                {columns.map((c, i) => {
                    const shown = !hidden.includes(c.key);
                    return (
                        <li
                            key={c.key}
                            className={[
                                'column-settings__item',
                                dragging === c.key ? 'column-settings__item--dragging' : '',
                                over === c.key && dragging !== c.key ? 'column-settings__item--over' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            draggable
                            onDragStart={(e) => {
                                setDragging(c.key);
                                // Firefox 不设数据就不触发拖放
                                e.dataTransfer?.setData('text/plain', c.key);
                                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                                if (dragging === null) return;
                                e.preventDefault();
                                if (over !== c.key) setOver(c.key);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (dragging !== null) moveTo(keys.indexOf(dragging), i);
                                endDrag();
                            }}
                            onDragEnd={endDrag}
                        >
                            <button
                                type="button"
                                className="column-settings__handle"
                                aria-label={`拖动排序 ${c.title}`}
                                title="拖动调整顺序（键盘：↑ / ↓）"
                                onKeyDown={(e) => {
                                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                                    e.preventDefault();
                                    moveTo(i, e.key === 'ArrowUp' ? i - 1 : i + 1);
                                }}
                            >
                                <GripVertical size={14} />
                            </button>
                            <Checkbox
                                checked={shown}
                                disabled={shown && visibleCount <= 1}
                                onChange={(e) =>
                                    onChange({ order: keys, hidden: e.target.checked ? hidden.filter((k) => k !== c.key) : [...hidden, c.key] })
                                }
                            >
                                {c.title}
                            </Checkbox>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
    return (
        <Popover trigger="click" position="bottomRight" content={content}>
            <span>
                <Tooltip content="列设置">
                    <Button type="tertiary" icon={<Settings size={14} />} aria-label="列设置" />
                </Tooltip>
            </span>
        </Popover>
    );
}

function titleText(col: ColumnProps<never>, key: string): string {
    return typeof col.title === 'string' ? col.title : key;
}

/**
 * 列表页接入列设置（偏好 showTableColumnSettings）：
 * `const { columns, columnSettings } = useColumnSettings('system/users', rawColumns)`，
 * 把 `columns` 交给 `<Table>`，`columnSettings` 放进 `SearchToolbar` 的 `tools`（或 `PageContainer` 的 `extra`）。
 * 设置按 `tableKey` 存 localStorage；偏好关掉时按钮消失、列恢复代码里的默认（保存的设置保留，重新打开后恢复）。
 */
export function useColumnSettings<T extends object>(tableKey: string, columns: ColumnProps<T>[]): { columns: ColumnProps<T>[]; columnSettings: ReactNode } {
    const { preferences } = usePreferences();
    const enabled = preferences.showTableColumnSettings;
    const [state, setState] = useState<ColumnState>(() => readColumnState(tableKey));

    const update = (next: ColumnState) => {
        setState(next);
        writeColumnState(tableKey, next);
    };

    if (!enabled) return { columns, columnSettings: null };

    const titles = new Map<string, string>();
    for (const col of columns) {
        const k = configurableKey(col);
        if (k !== null) titles.set(k, titleText(col, k));
    }
    const configurable = orderedKeys([...titles.keys()], state.order).map((key) => ({ key, title: titles.get(key) ?? key }));
    return {
        columns: applyColumnState(columns, state),
        columnSettings: <ColumnSettings columns={configurable} hidden={state.hidden} onChange={update} onReset={() => update(EMPTY)} />,
    };
}
