import { Input, List } from '@douyinfe/semi-ui';
import { Search } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import './NavListPanel.css';

export interface NavListPanelSearch {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onEnterPress?: () => void;
}

export interface NavListPanelProps<T> {
    /** 标题栏左侧文字 */
    title?: ReactNode;
    /** 标题栏右侧操作区（按钮 / 下拉菜单等） */
    headerExtra?: ReactNode;
    /** 提供时在标题栏下方渲染搜索框（固定，不随条目滚动） */
    search?: NavListPanelSearch;
    loading?: boolean;
    emptyText?: string;
    /** 底部插槽（分页等，固定，不随条目滚动） */
    footer?: ReactNode;
    dataSource: T[];
    renderItem: (item: T, index: number) => ReactNode;
    className?: string;
    style?: CSSProperties;
}

/**
 * 主从页左侧的导航列表面板（移植自 mono4ts `NavListPanel`）：标题栏 + 搜索框 + 可滚动条目 + 底部分页。
 * 条目用同文件的 `NavListItem`。面板本身占满父容器高度，父容器要给定高度（或 max-height）条目区才会在内部滚动。
 */
export function NavListPanel<T>({
    title,
    headerExtra,
    search,
    loading,
    emptyText = '暂无数据',
    footer,
    dataSource,
    renderItem,
    className,
    style,
}: NavListPanelProps<T>) {
    return (
        <div className={`nav-list-panel${className ? ` ${className}` : ''}`} style={style}>
            {(title !== undefined || headerExtra !== undefined) && (
                <div className="nav-list-panel__header">
                    {title !== undefined && <span className="nav-list-panel__title">{title}</span>}
                    {headerExtra !== undefined && <div className="nav-list-panel__header-extra">{headerExtra}</div>}
                </div>
            )}
            <List
                className="nav-list-panel__list"
                split={false}
                loading={loading}
                emptyContent={<div className="nav-list-panel__empty">{emptyText}</div>}
                header={
                    search ? (
                        <Input
                            size="small"
                            prefix={<Search size={14} />}
                            placeholder={search.placeholder ?? '搜索'}
                            aria-label={search.placeholder ?? '搜索'}
                            value={search.value}
                            onChange={search.onChange}
                            {...(search.onEnterPress ? { onEnterPress: search.onEnterPress } : {})}
                            showClear
                        />
                    ) : undefined
                }
                footer={footer}
                dataSource={dataSource}
                renderItem={renderItem}
            />
        </div>
    );
}

export interface NavListItemProps {
    active?: boolean;
    onClick?: () => void;
    /** 主标题（加粗） */
    primary: ReactNode;
    /** 副标题（主标题后以 · 分隔，超长省略） */
    secondary?: ReactNode;
    /** 第二行元信息（时间 / 标签等，颜色更淡） */
    meta?: ReactNode;
    /** 右侧操作区：默认悬停或选中时才显示 */
    extra?: ReactNode;
    className?: string;
    style?: CSSProperties;
}

/** NavListPanel 的条目：有 onClick 时主体是原生按钮；extra 区与按钮并列，不触发条目选择 */
export function NavListItem({ active, onClick, primary, secondary, meta, extra, className, style }: NavListItemProps) {
    const content = (
        <>
            <div className="nav-list-item__row1">
                <span className="nav-list-item__primary">{primary}</span>
                {secondary !== undefined && (
                    <>
                        <span className="nav-list-item__sep">·</span>
                        <span className="nav-list-item__secondary">{secondary}</span>
                    </>
                )}
            </div>
            {meta !== undefined && <div className="nav-list-item__meta">{meta}</div>}
        </>
    );
    return (
        <List.Item
            className={['nav-list-item', active ? 'nav-list-item--active' : '', className ?? ''].filter(Boolean).join(' ')}
            {...(style ? { style } : {})}
        >
            {onClick ? (
                <button type="button" className="nav-list-item__body" aria-pressed={active ?? false} onClick={onClick}>
                    {content}
                </button>
            ) : (
                <div className="nav-list-item__body">{content}</div>
            )}
            {extra !== undefined && (
                // 操作区与选择按钮是兄弟节点；仍拦住 portal 内菜单点击的 React 冒泡。
                <div className="nav-list-item__extra" onClick={(e) => e.stopPropagation()}>
                    {extra}
                </div>
            )}
        </List.Item>
    );
}
