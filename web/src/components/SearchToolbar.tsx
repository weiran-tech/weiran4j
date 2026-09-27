import { Button, Space, Tooltip } from '@douyinfe/semi-ui';
import { ChevronDown, ChevronUp, ListCollapse, ListTree, RefreshCw, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

/** 已生效的一个查询条件，渲染成工具栏下方可删除的标签 */
export interface SearchCondition {
    key: string;
    /** 条件名，如「状态」 */
    label: string;
    /** 条件值的展示文本，如「启用」（下拉类条件给选项名称而不是原始值） */
    value: string;
    /** 删除该条件（页面自己清掉对应字段并重新查询） */
    onRemove: () => void;
}

interface SearchToolbarProps {
    /** 筛选控件（常用条件，直接放在工具栏里） */
    children?: ReactNode;
    /** 最左侧的主操作（放在筛选控件之前，如「新增用户」） */
    leading?: ReactNode;
    /** 右侧操作（新增等） */
    actions?: ReactNode;
    /** 右侧工具按钮（列设置等，见 ColumnSettings）；约定顺序：展开树状 / 列设置 / 导出 / 刷新，按需出现 */
    tools?: ReactNode;
    onSearch?: () => void;
    onReset?: () => void;
    /** 提供时在工具区最末出现「刷新」（重新拉取当前查询，不改条件） */
    onRefresh?: () => void;
    refreshing?: boolean;
    /** 树形表格：在工具区最前出现「展开树状」开关（全部展开 ↔ 全部收起）；`expanded` 为当前是否全部展开 */
    treeExpand?: { expanded: boolean; onToggle: () => void };
    /**
     * 高级筛选面板的字段（每项用 `SearchField` 包一层）。提供时：工具栏的查询按钮只留图标、不显示「重置」，
     * 其右侧出现「高级筛选」开关（默认收起），面板底部是「搜索 / 重置」。
     */
    advanced?: ReactNode;
    /** 已生效的查询条件：非空时在工具栏下方显示为可删除的标签，并带「清空」（调用 onReset） */
    conditions?: readonly SearchCondition[];
}

/** 高级筛选面板里的一个字段：上方标签 + 下方控件（控件宽度撑满栅格列） */
export function SearchField({ label, children }: { label: string; children: ReactNode }) {
    const id = useId();
    return (
        <div className="search-field" role="group" aria-labelledby={id}>
            <span className="search-field__label" id={id}>
                {label}
            </span>
            <div className="search-field__control">{children}</div>
        </div>
    );
}

/**
 * 列表页顶部：（主操作）+ 常用筛选 + 查询 /（高级筛选开关），右侧工具按钮；
 * 下方依次是可选的高级筛选面板、已生效条件标签行。
 */
export function SearchToolbar({
    children,
    leading,
    actions,
    tools,
    onSearch,
    onReset,
    onRefresh,
    refreshing,
    treeExpand,
    advanced,
    conditions,
}: SearchToolbarProps) {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    /** 窄屏下高级面板字段区是否展开全部（默认只露两行，见 global.css 的 .search-advanced） */
    const [fieldsExpanded, setFieldsExpanded] = useState(false);
    const fieldsId = useId();
    const panelId = useId();
    const hasAdvanced = advanced !== undefined;

    return (
        <div className="search-toolbar-wrap">
            <div className="search-toolbar">
                <Space wrap spacing={8}>
                    {leading}
                    {hasAdvanced ? (
                        // 有高级筛选时，便捷搜索（筛选控件 + 图标查询按钮）整体在窄屏隐藏，高级面板是替代入口；
                        // display: contents 不影响平时的排版
                        <span className="search-toolbar__quick">
                            {children}
                            {onSearch && (
                                <Tooltip content="查询">
                                    <Button type="primary" theme="solid" icon={<Search size={16} />} aria-label="查询" onClick={onSearch} />
                                </Tooltip>
                            )}
                        </span>
                    ) : (
                        <>
                            {children}
                            {onSearch && (
                                <Button type="primary" icon={<Search size={14} />} onClick={onSearch}>
                                    查询
                                </Button>
                            )}
                        </>
                    )}
                    {onReset && !hasAdvanced && (
                        <Button type="tertiary" icon={<RotateCcw size={14} />} onClick={onReset}>
                            重置
                        </Button>
                    )}
                    {hasAdvanced && (
                        <Tooltip content={advancedOpen ? '收起高级筛选' : '高级筛选'}>
                            <Button
                                className={`search-toolbar__advanced-toggle${advancedOpen ? ' search-toolbar__advanced-toggle--open' : ''}`}
                                icon={<SlidersHorizontal size={16} />}
                                aria-label="高级筛选"
                                aria-expanded={advancedOpen}
                                aria-controls={panelId}
                                onClick={() => setAdvancedOpen((v) => !v)}
                            />
                        </Tooltip>
                    )}
                </Space>
                {(actions || tools || onRefresh || treeExpand) && (
                    <Space spacing={8} className="search-toolbar__tools">
                        {actions}
                        {treeExpand && (
                            <Tooltip content={treeExpand.expanded ? '全部收起' : '全部展开'}>
                                <Button
                                    type="tertiary"
                                    icon={treeExpand.expanded ? <ListCollapse size={14} /> : <ListTree size={14} />}
                                    aria-label={treeExpand.expanded ? '全部收起' : '全部展开'}
                                    onClick={treeExpand.onToggle}
                                />
                            </Tooltip>
                        )}
                        {tools}
                        {onRefresh && (
                            <Tooltip content="刷新">
                                <Button
                                    type="tertiary"
                                    icon={<RefreshCw size={14} {...(refreshing ? { className: 'search-toolbar__spin' } : {})} />}
                                    aria-label="刷新"
                                    onClick={onRefresh}
                                />
                            </Tooltip>
                        )}
                    </Space>
                )}
            </div>
            {hasAdvanced && advancedOpen && (
                <div
                    className={`search-advanced${fieldsExpanded ? ' search-advanced--expanded' : ''}`}
                    id={panelId}
                    role="region"
                    aria-label="高级筛选"
                >
                    {/* 窄屏（便捷搜索被隐藏时）字段区限高、只露两行，由下方箭头按钮展开 / 收起；宽屏不限高、不显示按钮 */}
                    <div className="search-advanced__fields" id={fieldsId}>
                        {advanced}
                    </div>
                    {/* 操作行在字段区之外且吸底：无论字段区收起、展开还是超出一屏，搜索 / 重置都可点 */}
                    <div className="search-advanced__actions">
                        <Space spacing={12}>
                            {onSearch && (
                                <Button type="primary" theme="solid" onClick={onSearch}>
                                    搜索
                                </Button>
                            )}
                            {onReset && (
                                <Button type="tertiary" theme="outline" onClick={onReset}>
                                    重置
                                </Button>
                            )}
                        </Space>
                        <Button
                            className="search-advanced__more"
                            theme="borderless"
                            size="small"
                            icon={fieldsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            iconPosition="right"
                            aria-expanded={fieldsExpanded}
                            aria-controls={fieldsId}
                            onClick={() => setFieldsExpanded((v) => !v)}
                        >
                            {fieldsExpanded ? '收起' : '展开'}
                        </Button>
                    </div>
                </div>
            )}
            {conditions && conditions.length > 0 && (
                <div className="search-conditions" role="group" aria-label="已选条件">
                    <span className="search-conditions__label">已选条件</span>
                    {conditions.map((c) => (
                        // 不用 Semi Tag 的 closable：它的关闭图标是不可聚焦的 div，键盘删不掉
                        <span key={c.key} className="search-conditions__tag">
                            <span className="search-conditions__text">
                                {c.label}：{c.value}
                            </span>
                            <button
                                type="button"
                                className="search-conditions__remove"
                                aria-label={`移除条件 ${c.label}：${c.value}`}
                                onClick={c.onRemove}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {onReset && (
                        <button type="button" className="search-conditions__clear" onClick={onReset}>
                            清空
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
