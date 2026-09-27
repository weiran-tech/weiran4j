import { Nav } from '@douyinfe/semi-ui';
import type { NavItemPropsWithItems, OnSelectedData, SubNavProps } from '@douyinfe/semi-ui/lib/es/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type NavItem = NavItemPropsWithItems | SubNavProps;

const MORE_KEY = '__topnav_more__';
/** 防亚像素取整、选中加粗等让「更多」被挤出去 */
const SAFETY = 6;

interface TopNavProps {
    items: NavItem[];
    selectedKeys: string[];
    onSelect: (data: OnSelectedData) => void;
    /** 导航地标名：horizontal 为「主导航」，mixed 为「分类导航」 */
    ariaLabel: string;
}

function anySelected(items: NavItem[], selected: Set<string>): boolean {
    return items.some((it) => selected.has(String(it.itemKey)) || ('items' in it && Array.isArray(it.items) && anySelected(it.items as NavItem[], selected)));
}

/**
 * 顶部水平导航（horizontal / mixed 布局，移植自 mono4ts `TopNavWithOverflow`）：
 * Semi `Nav mode="horizontal"` 渲染，放不下的项收进末尾「更多」下拉。
 * 宽度靠一个隐藏的探测 Nav 量出来（同 class 保证间距一致），容器尺寸变化时重算。
 * 量不到宽度（jsdom、容器未布局）时全部显示。
 */
export function TopNav({ items, selectedKeys, onSelect, ariaLabel }: TopNavProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const probeRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(items.length);

    const probeItems = useMemo<NavItem[]>(
        () => [...items, { itemKey: MORE_KEY, text: '更多', items: [{ itemKey: `${MORE_KEY}__probe`, text: ' ' }] }],
        [items],
    );

    const measure = useCallback(() => {
        const container = containerRef.current;
        const list = probeRef.current?.querySelector('.semi-navigation-list');
        if (!container || !list || container.clientWidth === 0) {
            setVisibleCount(items.length);
            return;
        }
        const children = Array.from(list.children) as HTMLElement[];
        const itemEls = children.slice(0, -1);
        const moreEl = children.at(-1);
        if (!moreEl || itemEls.length === 0) {
            setVisibleCount(items.length);
            return;
        }
        const r0 = children[0]?.getBoundingClientRect();
        const r1 = children[1]?.getBoundingClientRect();
        const gap = r0 && r1 ? Math.max(0, Math.round(r1.left - r0.right)) : 0;
        const widths = itemEls.map((el) => el.getBoundingClientRect().width);
        const available = container.clientWidth - SAFETY;
        const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, widths.length - 1) * gap;
        if (total <= available) {
            setVisibleCount(widths.length);
            return;
        }
        const moreW = moreEl.getBoundingClientRect().width + gap;
        let sum = 0;
        let count = 0;
        for (const [i, w0] of widths.entries()) {
            const w = w0 + (i > 0 ? gap : 0);
            if (sum + w + moreW > available) break;
            sum += w;
            count++;
        }
        setVisibleCount(Math.max(1, count));
    }, [items.length]);

    useLayoutEffect(() => {
        measure();
        // Semi 可能下一帧才把列表项渲染出来，再量一次
        const raf = requestAnimationFrame(measure);
        return () => cancelAnimationFrame(raf);
    }, [measure, probeItems]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;
        const ro = new ResizeObserver(() => measure());
        ro.observe(container);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    const overflow = visibleCount < items.length;
    const displayItems = useMemo<NavItem[]>(
        () => (overflow ? [...items.slice(0, visibleCount), { itemKey: MORE_KEY, text: '更多', items: items.slice(visibleCount) }] : items),
        [items, visibleCount, overflow],
    );
    // 溢出项里有选中的，「更多」一并高亮
    const effectiveSelected = useMemo(
        () => (overflow && anySelected(items.slice(visibleCount), new Set(selectedKeys)) ? [...selectedKeys, MORE_KEY] : selectedKeys),
        [overflow, items, visibleCount, selectedKeys],
    );

    return (
        <div ref={containerRef} className="admin-topnav" role="navigation" aria-label={ariaLabel}>
            <div ref={probeRef} className="admin-topnav__probe" aria-hidden="true" inert>
                <Nav className="admin-topnav__nav" mode="horizontal" items={probeItems} selectedKeys={[]} />
            </div>
            <Nav
                className="admin-topnav__nav"
                mode="horizontal"
                items={displayItems}
                selectedKeys={effectiveSelected}
                subNavCloseDelay={150}
                onSelect={(data) => {
                    if (String(data.itemKey) !== MORE_KEY) onSelect(data);
                }}
            />
        </div>
    );
}
