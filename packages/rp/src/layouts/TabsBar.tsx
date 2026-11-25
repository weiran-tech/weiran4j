import { Button, Dropdown } from '@douyinfe/semi-ui';
import { ChevronDown, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HOME_PATH } from '@/config';
import type { UserPreferences } from '@/hooks/usePreferences';
import { renderIcon } from '@/utils/icons';
import type { TabItem } from './useTabs';

interface TabsBarProps {
    tabs: TabItem[];
    activeKey: string;
    /** 页签前显示菜单图标（偏好 showTabIcon） */
    showIcon: boolean;
    /** 右侧「全部页签」下拉（偏好 showTabSwitcher） */
    showSwitcher: boolean;
    /** 双击页签行为（偏好 tabDoubleClickAction） */
    doubleClickAction: UserPreferences['tabDoubleClickAction'];
    /** 页签风格（偏好 tabStyle）：line 下划线 / pill 胶囊 / card 卡片 */
    tabStyle: UserPreferences['tabStyle'];
    /** 页签进出场动画（偏好 tabAnimation） */
    animation: UserPreferences['tabAnimation'];
    onSelect: (key: string) => void;
    onRefresh: (key: string) => void;
    onClose: (key: string) => void;
    onCloseOthers: (key: string) => void;
    onCloseAll: () => void;
}

/** 退场动画时长，与 AdminLayout.css 的 tab-*-out 一致 */
export const TAB_EXIT_MS = 250;

/**
 * 多页签栏：点击切换、双击按偏好刷新/关闭、× 关闭、右键「刷新 / 关闭 / 关闭其它 / 关闭全部」，右侧下拉列出全部页签。
 * 风格与动画挂在根节点的 `data-tab-style` / `data-tab-animation` 上，样式见 AdminLayout.css。
 * 动画（同 mono4ts）：新页签挂载即播进场动画（纯 CSS）；关闭单个页签先播退场动画再真正关闭。
 */
export function TabsBar({
    tabs,
    activeKey,
    showIcon,
    showSwitcher,
    doubleClickAction,
    tabStyle,
    animation,
    onSelect,
    onRefresh,
    onClose,
    onCloseOthers,
    onCloseAll,
}: TabsBarProps) {
    const [exiting, setExiting] = useState<ReadonlySet<string>>(() => new Set());
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    // 退场动画结束时要用**当时**的关闭逻辑：onClose 闭包里的页签列表与当前页在这 250ms 里可能已经变了
    const onCloseRef = useRef(onClose);
    useLayoutEffect(() => {
        onCloseRef.current = onClose;
    });
    // 卸载（如关掉多页签）时丢弃还没执行的关闭：页签栏都没了，再关页签、跳转只会打断用户
    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    const close = (key: string) => {
        if (animation === 'none') {
            onClose(key);
            return;
        }
        if (exiting.has(key)) return;
        setExiting((s) => new Set(s).add(key));
        const timer = setTimeout(() => {
            timers.current.delete(timer);
            setExiting((s) => {
                const n = new Set(s);
                n.delete(key);
                return n;
            });
            onCloseRef.current(key);
        }, TAB_EXIT_MS);
        timers.current.add(timer);
    };

    return (
        <div className="admin-tabs-bar" data-tab-style={tabStyle} data-tab-animation={animation}>
            <div className="admin-tabs-bar__scroll" role="tablist">
                {tabs.map((tab) => {
                    const closable = tab.key !== HOME_PATH;
                    const active = tab.key === activeKey;
                    return (
                        <Dropdown
                            key={tab.key}
                            trigger="contextMenu"
                            position="bottomLeft"
                            clickToHide
                            render={
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => onRefresh(tab.key)}>刷新</Dropdown.Item>
                                    <Dropdown.Item disabled={!closable} onClick={() => close(tab.key)}>
                                        关闭
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => onCloseOthers(tab.key)}>关闭其它</Dropdown.Item>
                                    <Dropdown.Item onClick={onCloseAll}>关闭全部</Dropdown.Item>
                                </Dropdown.Menu>
                            }
                        >
                            <div
                                role="tab"
                                tabIndex={0}
                                aria-selected={active}
                                className={`admin-tab-item${active ? ' admin-tab-item--active' : ''}${exiting.has(tab.key) ? ' admin-tab-item--exiting' : ''}`}
                                onClick={() => onSelect(tab.key)}
                                onDoubleClick={() => {
                                    if (doubleClickAction === 'refresh') onRefresh(tab.key);
                                    else if (doubleClickAction === 'close' && closable) close(tab.key);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSelect(tab.key);
                                }}
                            >
                                {showIcon && tab.icon && <span className="admin-tab-item__icon">{renderIcon(tab.icon, 14)}</span>}
                                <span className="admin-tab-item__text" title={tab.title}>
                                    {tab.title}
                                </span>
                                {closable && (
                                    <button
                                        type="button"
                                        className="admin-tab-item__close"
                                        aria-label={`关闭 ${tab.title}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            close(tab.key);
                                        }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </Dropdown>
                    );
                })}
            </div>
            {showSwitcher && (
                <div className="admin-tabs-bar__switcher">
                    <Dropdown
                        trigger="click"
                        position="bottomRight"
                        clickToHide
                        render={
                            <Dropdown.Menu>
                                {tabs.map((tab) => (
                                    <Dropdown.Item key={tab.key} active={tab.key === activeKey} onClick={() => onSelect(tab.key)}>
                                        {tab.title}
                                    </Dropdown.Item>
                                ))}
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => onCloseOthers(activeKey)}>关闭其它</Dropdown.Item>
                                <Dropdown.Item onClick={onCloseAll}>关闭全部</Dropdown.Item>
                            </Dropdown.Menu>
                        }
                    >
                        <Button theme="borderless" type="tertiary" icon={<ChevronDown size={14} />} aria-label="全部页签" />
                    </Dropdown>
                </div>
            )}
        </div>
    );
}
