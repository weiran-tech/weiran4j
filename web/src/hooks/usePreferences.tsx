import { createContext, useContext } from 'react';
import { DEFAULT_PRIMARY, isValidThemeColor } from '@/lib/theme-color';
import { THEME_MODES, type ThemeMode } from '@/lib/theme';

/**
 * 界面偏好：字段定义与默认值的唯一事实源（契约 §6.1 `/api/auth/preferences` 只存不校验）。
 * 移植自 mono4ts `hooks/usePreferences.tsx`。
 *
 * 新增字段：见 openspec/rules/advisory/components.md「新增偏好字段的步骤」。
 */

export type NavLayout = 'vertical' | 'horizontal' | 'mixed' | 'double';
export type DoubleRailStyle = 'icon' | 'icon-text';
export type TabAnimation = 'none' | 'fade' | 'slide' | 'scale';
export type TabStyle = 'line' | 'pill' | 'card';
export type TableSizePreference = 'small' | 'default' | 'middle';
export type RouteAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left';

export interface UserPreferences {
    /** 启用多页签 */
    enableTabs: boolean;
    /** 保存页签：刷新页面后恢复上次打开的页签 */
    keepTabs: boolean;
    /** 页面缓存：菜单开启 keepAlive 的页面在切换页签时保留组件状态（React Activity，layouts/KeepAliveOutlet）；关闭多页签时不缓存 */
    enablePageCache: boolean;
    /** 最大页签数（含首页），超限按 tabEvictPolicy 关闭 */
    tabsMaxCount: number;
    /** 页签显示菜单图标 */
    showTabIcon: boolean;
    /** 页签风格：line 下划线 / pill 胶囊 / card 卡片 */
    tabStyle: TabStyle;
    /** 导航布局：vertical 侧边 / horizontal 顶部 / mixed 顶部一级 + 侧边子级 / double 图标轨 + 子菜单栏；窄屏一律抽屉 */
    navLayout: NavLayout;
    /** 双列菜单首列形式（仅 double 布局）：icon 仅图标，与侧边栏收起同宽，名称走悬浮提示 / icon-text 图标 + 文字 */
    doubleRailStyle: DoubleRailStyle;
    /** 显示面包屑 */
    showBreadcrumb: boolean;
    /** 面包屑是否显示图标 */
    breadcrumbIcon: boolean;
    /** 面包屑导航是否从首页开始（显示首页作为第一项） */
    breadcrumbShowHome: boolean;
    /** 页签动画：打开 / 关闭页签时页签本身的进出场动画（同 mono4ts；内容区过渡见 routeAnimation） */
    tabAnimation: TabAnimation;
    /** 颜色模式：浅色 / 深色 / 跟随系统 */
    colorMode: ThemeMode;
    /** 主题色：预设 key（如 `green`）或 `#rrggbb` */
    themeColor: string;
    /** 侧边栏深色（仅浅色主题下生效） */
    sidebarDarkMode: boolean;
    /** 顶栏深色（仅浅色主题下生效） */
    headerDarkMode: boolean;
    /** 全局搜索：顶栏搜索入口 + Ctrl/⌘+K 命令面板（layouts/GlobalSearch，同 zenith-admin）；关闭后快捷键也不生效 */
    showMenuSearch: boolean;
    /** 顶栏全屏按钮 */
    showFullscreen: boolean;
    /** 侧边栏显示 Logo */
    showLogo: boolean;
    /** 显示收藏快捷入口（面包屑收藏按钮 + 顶部 Popover），数据走 /api/auth/favorite-menus */
    showFavorites: boolean;
    /** 动态标题：浏览器标签显示「页面名 - 应用名」 */
    dynamicTitle: boolean;
    /** 文件管理视图模式：预留给文件模块，当前无消费方（本项目没有文件模块，也不在偏好抽屉里） */
    filesViewMode: 'list' | 'grid';
    /** 侧边栏顶层分组标题滚动吸顶 */
    sidebarStickyScroll: boolean;
    /** 表格列设置按钮：列的显隐与顺序，按页面存 localStorage（components/ColumnSettings） */
    showTableColumnSettings: boolean;
    /** 表格边框 */
    tableBordered: boolean;
    /** 表格斑马纹 */
    tableStriped: boolean;
    /** 表格尺寸 */
    tableSize: TableSizePreference;
    /** 列表默认分页大小 */
    tablePageSize: number;
    /** 锁屏：顶栏按钮 / Alt+L 锁定，登录密码经 /api/auth/verify-password 解锁；锁定状态存 sessionStorage */
    enableLockScreen: boolean;
    /** 侧边栏手风琴展开：同级只允许展开一个子菜单 */
    sidebarAccordion: boolean;
    /** 侧边栏悬浮模式：开启后，侧边栏收起时鼠标移入临时展开，移开则自动收起 */
    sidebarHoverTrigger: boolean;
    /** 面包屑可点击跳转：false 时仅展示文字路径，防止误触导致表单中断 */
    breadcrumbClickable: boolean;
    /** 面包屑目录节点悬停弹出子菜单 Popover */
    breadcrumbSubMenu: boolean;
    /** 新开页签插入行为：append 追加到末尾 / insert-next 插在当前页签之后 */
    openTabBehavior: 'append' | 'insert-next';
    /** 菜单选中时自动滚动到可视区 */
    scrollMenuIntoView: boolean;
    /** 双击页签行为：refresh 刷新 / close 关闭 / none 无 */
    tabDoubleClickAction: 'refresh' | 'close' | 'none';
    /** 路由切换动画：内容区进场动画；开启页面缓存的页面不参与 */
    routeAnimation: RouteAnimation;
    /** 最大页签超限后的关闭策略：fifo 最早打开，lru 最近最少使用 */
    tabEvictPolicy: 'fifo' | 'lru';
    /** 灰色模式（国家公祭日等场景） */
    grayscale: boolean;
    /** 色弱模式（提高对比度） */
    colorBlind: boolean;
    /** 内容区域宽度模式：fluid 流式充满（默认）/ fixed 固定最大宽度居中 */
    contentWidth: 'fluid' | 'fixed';
    /** 侧边栏展开宽度（px） */
    sidebarWidth: number;
    /** 显示回到顶部按钮（内容区滚动超过 400px 后浮现） */
    showBackTop: boolean;
    /** 页签栏右侧显示页签切换器（下拉列表） */
    showTabSwitcher: boolean;
}

/** 与 mono4ts 的差异：navLayout=vertical、enableTabs=true、tablePageSize=20（本项目现状） */
export const defaultPreferences: UserPreferences = {
    enableTabs: true,
    keepTabs: true,
    enablePageCache: true,
    tabsMaxCount: 20,
    showTabIcon: true,
    tabStyle: 'line',
    navLayout: 'vertical',
    doubleRailStyle: 'icon',
    showBreadcrumb: true,
    breadcrumbIcon: true,
    breadcrumbShowHome: true,
    tabAnimation: 'fade',
    colorMode: 'light',
    themeColor: DEFAULT_PRIMARY,
    sidebarDarkMode: false,
    headerDarkMode: false,
    showMenuSearch: true,
    showFullscreen: true,
    showLogo: true,
    showFavorites: false,
    dynamicTitle: true,
    filesViewMode: 'list',
    sidebarStickyScroll: true,
    showTableColumnSettings: true,
    tableBordered: true,
    tableStriped: false,
    tableSize: 'small',
    tablePageSize: 20,
    enableLockScreen: false,
    sidebarAccordion: true,
    sidebarHoverTrigger: false,
    breadcrumbClickable: true,
    breadcrumbSubMenu: false,
    openTabBehavior: 'append',
    scrollMenuIntoView: true,
    tabDoubleClickAction: 'close',
    tabEvictPolicy: 'fifo',
    routeAnimation: 'none',
    grayscale: false,
    colorBlind: false,
    contentWidth: 'fluid',
    sidebarWidth: 240,
    showBackTop: true,
    showTabSwitcher: true,
};

/** 枚举型字段的合法取值；服务端 / 本地缓存里的非法值逐字段回落默认值 */
const ENUM_OPTIONS: { [K in keyof UserPreferences]?: readonly UserPreferences[K][] } = {
    tabStyle: ['line', 'pill', 'card'],
    navLayout: ['vertical', 'horizontal', 'mixed', 'double'],
    doubleRailStyle: ['icon', 'icon-text'],
    tabAnimation: ['none', 'fade', 'slide', 'scale'],
    colorMode: THEME_MODES,
    filesViewMode: ['list', 'grid'],
    tableSize: ['small', 'default', 'middle'],
    openTabBehavior: ['append', 'insert-next'],
    tabDoubleClickAction: ['refresh', 'close', 'none'],
    routeAnimation: ['none', 'fade', 'slide-up', 'slide-left'],
    tabEvictPolicy: ['fifo', 'lru'],
    contentWidth: ['fluid', 'fixed'],
};

/** 数值型字段的取值范围（闭区间，取整） */
export const NUMBER_RANGES = {
    tabsMaxCount: [5, 50],
    sidebarWidth: [160, 320],
    tablePageSize: [10, 100],
} as const satisfies { [K in keyof UserPreferences]?: readonly [number, number] };

function isValidField<K extends keyof UserPreferences>(key: K, value: unknown): value is UserPreferences[K] {
    const def = defaultPreferences[key];
    if (typeof value !== typeof def) return false;
    if (key === 'themeColor') return isValidThemeColor(value);
    const options = ENUM_OPTIONS[key] as readonly unknown[] | undefined;
    if (options) return options.includes(value);
    if (typeof value === 'number') {
        const range = (NUMBER_RANGES as Partial<Record<keyof UserPreferences, readonly [number, number]>>)[key];
        if (!Number.isFinite(value)) return false;
        if (range) return Number.isInteger(value) && value >= range[0] && value <= range[1];
    }
    return true;
}

/** 任意输入 → 完整偏好：只认已定义的字段，类型 / 取值非法的逐字段回落默认值，未知字段丢弃 */
export function normalizePreferences(raw: unknown): UserPreferences {
    const next: UserPreferences = { ...defaultPreferences };
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return next;
    const source = raw as Record<string, unknown>;
    for (const key of Object.keys(defaultPreferences) as (keyof UserPreferences)[]) {
        const value = source[key];
        if (isValidField(key, value)) (next as unknown as Record<string, unknown>)[key] = value;
    }
    return next;
}

export interface PreferencesContextValue {
    preferences: UserPreferences;
    /** 局部更新：立即写本地缓存，已登录时 500ms 防抖同步到服务端 */
    setPreferences: (partial: Partial<UserPreferences>) => void;
    /** 恢复默认：清本地缓存，已登录时立即同步 */
    resetPreferences: () => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function useOptionalPreferences(): PreferencesContextValue | null {
    return useContext(PreferencesContext);
}

export function usePreferences(): PreferencesContextValue {
    const ctx = useContext(PreferencesContext);
    if (!ctx) throw new Error('usePreferences 必须在 PreferencesProvider 内使用');
    return ctx;
}
