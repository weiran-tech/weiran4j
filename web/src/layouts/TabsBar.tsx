import { Button, Dropdown } from '@douyinfe/semi-ui';
import { ChevronDown, X } from 'lucide-react';
import { HOME_PATH } from '@/config';
import type { TabItem } from './useTabs';

interface TabsBarProps {
    tabs: TabItem[];
    activeKey: string;
    onSelect: (key: string) => void;
    onClose: (key: string) => void;
    onCloseOthers: (key: string) => void;
    onCloseAll: () => void;
}

/** 多页签栏：点击切换、× 关闭、右键「关闭 / 关闭其它 / 关闭全部」，右侧下拉列出全部页签 */
export function TabsBar({ tabs, activeKey, onSelect, onClose, onCloseOthers, onCloseAll }: TabsBarProps) {
    return (
        <div className="admin-tabs" role="tablist">
            <div className="admin-tabs__list">
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
                                    <Dropdown.Item disabled={!closable} onClick={() => onClose(tab.key)}>
                                        关闭
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => onCloseOthers(tab.key)}>关闭其它</Dropdown.Item>
                                    <Dropdown.Item onClick={onCloseAll}>关闭全部</Dropdown.Item>
                                </Dropdown.Menu>
                            }
                        >
                            <div
                                role="tab"
                                aria-selected={active}
                                className={`admin-tabs__tab${active ? ' admin-tabs__tab--active' : ''}`}
                                onClick={() => onSelect(tab.key)}
                            >
                                <span>{tab.title}</span>
                                {closable && (
                                    <span
                                        className="admin-tabs__close"
                                        role="button"
                                        aria-label={`关闭 ${tab.title}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClose(tab.key);
                                        }}
                                    >
                                        <X size={12} />
                                    </span>
                                )}
                            </div>
                        </Dropdown>
                    );
                })}
            </div>
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
                <Button theme="borderless" type="tertiary" size="small" icon={<ChevronDown size={14} />} aria-label="全部页签" />
            </Dropdown>
        </div>
    );
}
