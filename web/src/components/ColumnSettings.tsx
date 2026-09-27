import { Button, Checkbox, Popover, Tooltip } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { ArrowDown, ArrowUp, Columns3 } from 'lucide-react';
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

/** 列设置按钮 + 弹层：勾选显隐、上移下移调整顺序、恢复默认；至少保留一列 */
export function ColumnSettings({ columns, hidden, onChange, onReset }: ColumnSettingsProps) {
    const keys = columns.map((c) => c.key);
    const visibleCount = keys.filter((k) => !hidden.includes(k)).length;
    const move = (index: number, delta: number) => {
        const next = [...keys];
        const [item] = next.splice(index, 1);
        if (item === undefined) return;
        next.splice(index + delta, 0, item);
        onChange({ order: next, hidden });
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
                        <li key={c.key} className="column-settings__item">
                            <Checkbox
                                checked={shown}
                                disabled={shown && visibleCount <= 1}
                                onChange={(e) =>
                                    onChange({ order: keys, hidden: e.target.checked ? hidden.filter((k) => k !== c.key) : [...hidden, c.key] })
                                }
                            >
                                {c.title}
                            </Checkbox>
                            <span className="column-settings__moves">
                                <Button
                                    size="small"
                                    theme="borderless"
                                    type="tertiary"
                                    icon={<ArrowUp size={13} />}
                                    aria-label={`上移 ${c.title}`}
                                    disabled={i === 0}
                                    onClick={() => move(i, -1)}
                                />
                                <Button
                                    size="small"
                                    theme="borderless"
                                    type="tertiary"
                                    icon={<ArrowDown size={13} />}
                                    aria-label={`下移 ${c.title}`}
                                    disabled={i === columns.length - 1}
                                    onClick={() => move(i, 1)}
                                />
                            </span>
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
                    <Button type="tertiary" icon={<Columns3 size={14} />} aria-label="列设置" />
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
