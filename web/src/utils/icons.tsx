/**
 * 菜单 icon 字段（lucide 图标名）→ 组件。
 *
 * mono4ts 懒加载全量 lucide 表（~600KB）；这里只收一份常用白名单，
 * 静态导入可被摇树，IconPicker 也从这份清单里挑。基座需要新图标时往下面追加即可。
 *
 * fork 跟随本仓的下游不改本文件（D-012，契约 §2.2）：在 `src/biz/icons*.ts` 里
 * `export const icons = { Rocket }`，构建时由 `import.meta.glob` 合并进来，与基座同名的以基座为准。
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

const BASE_ICONS: Readonly<Record<string, LucideIcon>> = {
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

/** 下游图标文件的导出形状：`export const icons: Record<string, LucideIcon>` */
export type BizIconModule = { icons?: Readonly<Record<string, LucideIcon>> };

/**
 * 把下游图标并入基座白名单。基座已有的名字不覆盖（下游不应悄悄改掉基座菜单的图标），交给 `onDuplicate` 报告。
 * 多个下游文件按文件路径排序后依次合并，结果与 glob 的返回顺序无关。
 */
export function mergeIcons(
    base: Readonly<Record<string, LucideIcon>>,
    modules: Readonly<Record<string, BizIconModule>>,
    onDuplicate: (name: string, file: string) => void = () => {},
): Readonly<Record<string, LucideIcon>> {
    const merged: Record<string, LucideIcon> = { ...base };
    for (const [file, mod] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
        for (const [name, icon] of Object.entries(mod.icons ?? {})) {
            if (Object.hasOwn(base, name)) {
                onDuplicate(name, file);
                continue;
            }
            merged[name] = icon;
        }
    }
    return merged;
}

// 下游独占目录，上游永不创建；没有匹配文件时 glob 返回空对象。
const bizIconModules = import.meta.glob<BizIconModule>('../biz/icons*.ts', { eager: true });

export const MENU_ICONS: Readonly<Record<string, LucideIcon>> = mergeIcons(BASE_ICONS, bizIconModules, (name, file) => {
    if (import.meta.env.DEV) console.warn(`[icons] ${file} 的图标 ${name} 与基座重名，已忽略（以基座为准）`);
});

export const MENU_ICON_NAMES: readonly string[] = Object.keys(MENU_ICONS).sort((a, b) => a.localeCompare(b));

/** 渲染指定名称的图标；名称为空或不在白名单时返回 null */
export function renderIcon(name: string | null | undefined, size = 16) {
    if (!name) return null;
    const Icon = MENU_ICONS[name];
    return Icon ? <Icon size={size} strokeWidth={1.75} /> : null;
}

/**
 * 交给 Semi 组件图标属性的 lucide 图标（Nav 的 items、Breadcrumb.Item 的 icon 等）。
 *
 * Semi 的 SubNav（目录节点）会 `cloneElement(icon, { size: 'large' })`，Breadcrumb.Item 会
 * `cloneElement(icon, { size: 'default', className })` 覆盖图标尺寸——这对 Semi 自家图标是具名尺寸，
 * 但 lucide 会把它原样写成 `<svg width="large">` / `width="default"`，非法宽度让 SVG 失去尺寸约束而撑满容器
 * （侧边栏目录图标、顶栏面包屑都中过招，单测看不出来）。这里用一个吞掉 `size` 的包装组件承接 Semi 注入的属性，
 * 尺寸由我们自己定；`className` 照传，保留 Semi 的间距样式。
 */
function SemiSafeIcon({ name, iconSize, className }: { name: string; iconSize: number; size?: unknown; className?: string }) {
    const Icon = MENU_ICONS[name];
    return Icon ? <Icon size={iconSize} strokeWidth={1.75} {...(className ? { className } : {})} /> : null;
}

export function renderNavIcon(name: string | null | undefined, size = 16) {
    return name && MENU_ICONS[name] ? <SemiSafeIcon name={name} iconSize={size} /> : null;
}
