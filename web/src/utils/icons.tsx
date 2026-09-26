/**
 * 菜单 icon 字段（lucide 图标名）→ 组件。
 *
 * mono4ts 懒加载全量 lucide 表（~600KB）；这里只收一份常用白名单，
 * 静态导入可被摇树，IconPicker 也从这份清单里挑。需要新图标时往下面追加即可。
 */
import {
    Activity,
    AppWindow,
    Archive,
    BarChart3,
    Bell,
    BookOpen,
    Boxes,
    Briefcase,
    Building2,
    Calendar,
    ChartPie,
    CircleHelp,
    ClipboardList,
    Cloud,
    Code,
    Cog,
    Database,
    FileClock,
    FileText,
    Folder,
    FolderTree,
    Gauge,
    Globe,
    Hammer,
    Heart,
    History,
    House,
    Image,
    KeyRound,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    LayoutList,
    Link,
    List,
    Lock,
    LogIn,
    Mail,
    Map as MapIcon,
    MessageSquare,
    Monitor,
    Network,
    Package,
    Palette,
    Printer,
    Puzzle,
    ScrollText,
    Search,
    Server,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingCart,
    SlidersHorizontal,
    Star,
    Tag,
    Timer,
    ToggleLeft,
    Truck,
    User,
    UserCog,
    UsersRound,
    Wallet,
    Workflow,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

export const MENU_ICONS: Readonly<Record<string, LucideIcon>> = {
    Activity,
    AppWindow,
    Archive,
    BarChart3,
    Bell,
    BookOpen,
    Boxes,
    Briefcase,
    Building2,
    Calendar,
    ChartPie,
    CircleHelp,
    ClipboardList,
    Cloud,
    Code,
    Cog,
    Database,
    FileClock,
    FileText,
    Folder,
    FolderTree,
    Gauge,
    Globe,
    Hammer,
    Heart,
    History,
    House,
    Image,
    KeyRound,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    LayoutList,
    Link,
    List,
    Lock,
    LogIn,
    Mail,
    Map: MapIcon,
    MessageSquare,
    Monitor,
    Network,
    Package,
    Palette,
    Printer,
    Puzzle,
    ScrollText,
    Search,
    Server,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingCart,
    SlidersHorizontal,
    Star,
    Tag,
    Timer,
    ToggleLeft,
    Truck,
    User,
    UserCog,
    UsersRound,
    Wallet,
    Workflow,
    Wrench,
};

export const MENU_ICON_NAMES: readonly string[] = Object.keys(MENU_ICONS).sort((a, b) => a.localeCompare(b));

/** 渲染指定名称的图标；名称为空或不在白名单时返回 null */
export function renderIcon(name: string | null | undefined, size = 16) {
    if (!name) return null;
    const Icon = MENU_ICONS[name];
    return Icon ? <Icon size={size} strokeWidth={1.75} /> : null;
}

/**
 * 给 Semi `Nav` 用的菜单图标。
 *
 * Semi 的 SubNav（目录节点）会 `cloneElement(icon, { size: 'large' })` 覆盖图标尺寸——
 * 这对 Semi 自家图标是具名尺寸，但 lucide 会把它原样写成 `<svg width="large">`，
 * 非法宽度让 SVG 失去尺寸约束而撑满侧边栏。症状只出现在目录节点（普通菜单项不走 clone），
 * 单测也看不出来。这里用一个吞掉 `size` 的包装组件承接 Semi 注入的属性，尺寸由我们自己定。
 */
function NavIcon({ name }: { name: string; size?: unknown }) {
    return renderIcon(name);
}

export function renderNavIcon(name: string | null | undefined) {
    return name && MENU_ICONS[name] ? <NavIcon name={name} /> : null;
}
