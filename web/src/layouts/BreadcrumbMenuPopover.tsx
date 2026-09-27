import { Popover } from '@douyinfe/semi-ui';
import { ChevronRight } from 'lucide-react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { MenuNode } from '@/types/api';
import { renderIcon } from '@/utils/icons';

/** 点到叶子菜单后关掉整棵 Popover 树 */
const CloseAllContext = createContext<() => void>(() => {});

/** 面包屑弹层里展示的子节点：启用、可见、非按钮；目录没有可展示的后代时也不展示 */
export function visibleMenuChildren(nodes: readonly MenuNode[] | null | undefined): MenuNode[] {
    return (nodes ?? []).filter(
        (c) =>
            c.status === 'enabled' &&
            c.visible &&
            c.type !== 'button' &&
            (c.type === 'menu' ? !!c.path : visibleMenuChildren(c.children).length > 0),
    );
}

function MenuEntry({ item, onNavigate }: { item: MenuNode; onNavigate: (menu: MenuNode) => void }) {
    const closeAll = useContext(CloseAllContext);
    const children = item.type === 'directory' ? visibleMenuChildren(item.children) : [];
    const isDir = children.length > 0;
    const go = () => {
        if (isDir) return;
        closeAll();
        onNavigate(item);
    };
    const row = (
        <div
            role="menuitem"
            tabIndex={0}
            className={`breadcrumb-menu__item${isDir ? ' breadcrumb-menu__item--dir' : ''}`}
            onClick={go}
            onKeyDown={(e) => {
                if (e.key === 'Enter') go();
            }}
        >
            <span className="breadcrumb-menu__label">
                {item.icon && <span className="breadcrumb-menu__icon">{renderIcon(item.icon, 13)}</span>}
                {item.title}
            </span>
            {isDir && <ChevronRight size={12} className="breadcrumb-menu__arrow" />}
        </div>
    );
    if (!isDir) return row;
    return (
        <Popover trigger="hover" position="rightTop" mouseEnterDelay={80} mouseLeaveDelay={300} showArrow={false} content={<MenuList items={children} onNavigate={onNavigate} />}>
            {row}
        </Popover>
    );
}

function MenuList({ items, onNavigate }: { items: MenuNode[]; onNavigate: (menu: MenuNode) => void }) {
    return (
        <div className="breadcrumb-menu" role="menu">
            {items.map((item) => (
                <MenuEntry key={item.id} item={item} onNavigate={onNavigate} />
            ))}
        </div>
    );
}

interface BreadcrumbMenuPopoverProps {
    /** 目录节点下的子菜单（已按 visibleMenuChildren 过滤） */
    items: MenuNode[];
    onNavigate: (menu: MenuNode) => void;
    children: ReactNode;
}

/**
 * 面包屑目录节点的子菜单弹层（偏好 breadcrumbSubMenu，移植自 mono4ts `BreadcrumbMenuPopover`）：
 * 悬停目录节点弹出，支持多级目录逐级展开，点击叶子菜单跳转并收起。
 */
export function BreadcrumbMenuPopover({ items, onNavigate, children }: BreadcrumbMenuPopoverProps) {
    const [visible, setVisible] = useState(false);
    if (!items.length) return <>{children}</>;
    return (
        <CloseAllContext.Provider value={() => setVisible(false)}>
            <Popover
                trigger="hover"
                visible={visible}
                onVisibleChange={setVisible}
                position="bottomLeft"
                mouseEnterDelay={100}
                mouseLeaveDelay={300}
                showArrow={false}
                content={<MenuList items={items} onNavigate={onNavigate} />}
            >
                <span className="breadcrumb-menu__trigger">{children}</span>
            </Popover>
        </CloseAllContext.Provider>
    );
}
