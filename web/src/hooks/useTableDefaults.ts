import { usePreferences } from './usePreferences';

/** 没写 width 的列（描述、组件路径这类弹性列）计入横向滚动阈值的最小宽度 */
export const FLEX_COLUMN_MIN_WIDTH = 120;

/**
 * 表格 `scroll.x`：各列真正需要的最小总宽——写了数字 width 的列按 width，没写的按 `flexMin`。
 *
 * Semi 在内容区比它宽时会把表格拉满（多出的宽度按列宽比例分给各列，主要给弹性列），
 * 只有内容区**比这个值窄**时才出现横向滚动。不要手写一个估出来的数：写小了弹性列被挤到几十像素
 * （标签溢出到隔壁列），写大了在窄布局（double 布局 / 较宽侧边栏）下无谓地出现滚动、右侧固定的操作列压住内容。
 * 传**列设置之后**的列，隐藏列后阈值随之变小。
 */
export function tableScrollX(columns: readonly { width?: string | number }[], flexMin = FLEX_COLUMN_MIN_WIDTH): number {
    return columns.reduce((sum, c) => sum + (typeof c.width === 'number' ? c.width : flexMin), 0);
}

/** 列表分页大小的可选值（偏好抽屉与各表格的 pageSizeOpts 共用） */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * 表格的统一默认值（来自偏好 tableSize / tableBordered / tableStriped / tablePageSize）。
 *
 * - `tableProps` 直接展开到 Semi `<Table>`：尺寸、边框、斑马纹（Semi 没有 striped 属性，靠 class + global.css）；
 * - `pageSize` 是分页表格的**初始**每页条数，用作 `useState(pageSize)` 的初值：
 *   用户在某个列表里手动换过每页条数后以手动为准，改偏好只影响之后打开的页面；
 * - `pageSizeOpts` 放进 `pagination`，保证偏好里选的值一定在下拉里。
 */
export function useTableDefaults() {
    const { preferences } = usePreferences();
    const { tableSize, tableBordered, tableStriped, tablePageSize } = preferences;
    return {
        tableProps: {
            size: tableSize,
            bordered: tableBordered,
            className: tableStriped ? 'weiran-table weiran-table--striped' : 'weiran-table',
        },
        pageSize: tablePageSize,
        pageSizeOpts: PAGE_SIZE_OPTIONS.includes(tablePageSize) ? PAGE_SIZE_OPTIONS : [...PAGE_SIZE_OPTIONS, tablePageSize].sort((a, b) => a - b),
    };
}
