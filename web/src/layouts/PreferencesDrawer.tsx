import { Button, InputNumber, Modal, Radio, RadioGroup, Select, SideSheet, Switch, Tooltip } from '@douyinfe/semi-ui';
import { Info, RotateCcw } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { NUMBER_RANGES, usePreferences, type TableSizePreference, type UserPreferences } from '@/hooks/usePreferences';
import { PAGE_SIZE_OPTIONS } from '@/hooks/useTableDefaults';
import type { ThemeMode } from '@/lib/theme';
import { useThemeController } from '@/providers/theme-context';
import { ThemeColorPanel } from './ThemeSwitcher';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="prefs-section" aria-label={title}>
            <div className="prefs-section__title">{title}</div>
            <div className="prefs-section__body">{children}</div>
        </section>
    );
}

function Row({ label, hint, labelId, children }: { label: string; hint?: string; labelId?: string; children: ReactNode }) {
    return (
        <div className="prefs-row">
            <span className="prefs-row__label" id={labelId}>
                {label}
                {hint && (
                    <Tooltip content={hint} position="right">
                        <Info size={13} className="prefs-row__hint" />
                    </Tooltip>
                )}
            </span>
            <span className="prefs-row__control">{children}</span>
        </div>
    );
}

type EnumField = 'navLayout' | 'tabAnimation' | 'routeAnimation';

/** 下拉行：Semi Select 会覆盖 aria-label，改用 aria-labelledby 指向行文案 */
function SelectRow<K extends EnumField>({ label, hint, field, options }: { label: string; hint?: string; field: K; options: [UserPreferences[K], string][] }) {
    const { preferences, setPreferences } = usePreferences();
    const labelId = useId();
    return (
        <Row label={label} labelId={labelId} {...(hint ? { hint } : {})}>
            <Select
                aria-labelledby={labelId}
                size="small"
                style={{ width: 120 }}
                value={preferences[field]}
                onChange={(v) => setPreferences({ [field]: v })}
                optionList={options.map(([value, text]) => ({ value, label: text }))}
            />
        </Row>
    );
}

/** 开关行：aria-label 即文案，测试与读屏都按它找 */
function SwitchRow({ label, hint, field }: { label: string; hint?: string; field: { [K in keyof UserPreferences]: UserPreferences[K] extends boolean ? K : never }[keyof UserPreferences] }) {
    const { preferences, setPreferences } = usePreferences();
    return (
        <Row label={label} {...(hint ? { hint } : {})}>
            <Switch aria-label={label} checked={preferences[field]} onChange={(v) => setPreferences({ [field]: v })} />
        </Row>
    );
}

interface PreferencesDrawerProps {
    visible: boolean;
    onClose: () => void;
}

/**
 * 偏好设置抽屉（顶栏齿轮按钮打开），分组同 mono4ts：外观 / 布局与导航 / 页签 / 面包屑 / 表格 / 其它。
 * 只放已经接通行为的字段；filesViewMode 预留给文件模块（本项目没有），不出现在这里。
 */
export function PreferencesDrawer({ visible, onClose }: PreferencesDrawerProps) {
    const { preferences, setPreferences, resetPreferences } = usePreferences();
    const { mode, isDark, setMode } = useThemeController();

    const confirmReset = () => {
        Modal.confirm({
            title: '恢复默认设置',
            content: '确定要将所有偏好设置恢复为默认值吗？',
            okText: '恢复默认',
            cancelText: '取消',
            okButtonProps: { type: 'danger', theme: 'solid' },
            onOk: resetPreferences,
        });
    };

    return (
        <SideSheet
            className="prefs-drawer"
            title="偏好设置"
            visible={visible}
            onCancel={onClose}
            width="min(92vw, 380px)"
            footer={
                <Button block type="danger" theme="light" icon={<RotateCcw size={14} />} onClick={confirmReset}>
                    恢复默认
                </Button>
            }
        >
            <Section title="外观">
                <Row label="颜色模式">
                    <RadioGroup type="button" aria-label="颜色模式" value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
                        <Radio value="light">浅色</Radio>
                        <Radio value="dark">深色</Radio>
                        <Radio value="system">系统</Radio>
                    </RadioGroup>
                </Row>
                <div className="prefs-row prefs-row--stack">
                    <span className="prefs-row__label">主题色</span>
                    <ThemeColorPanel embedded />
                </div>
                {!isDark && <SwitchRow label="顶栏深色" hint="浅色主题下单独把顶栏切成深色" field="headerDarkMode" />}
                {!isDark && <SwitchRow label="侧边栏深色" hint="浅色主题下单独把侧边栏切成深色" field="sidebarDarkMode" />}
            </Section>

            <Section title="布局与导航">
                <SelectRow
                    label="导航布局"
                    hint="窄屏（< 768px）一律使用抽屉导航"
                    field="navLayout"
                    options={[
                        ['vertical', '侧边菜单'],
                        ['horizontal', '顶部菜单'],
                        ['mixed', '顶部 + 侧边'],
                        ['double', '双栏菜单'],
                    ]}
                />
                <SwitchRow label="显示 Logo" field="showLogo" />
                {preferences.navLayout !== 'horizontal' && (
                    <Row label="侧边栏宽度">
                        <InputNumber
                            aria-label="侧边栏宽度"
                            size="small"
                            style={{ width: 110 }}
                            min={NUMBER_RANGES.sidebarWidth[0]}
                            max={NUMBER_RANGES.sidebarWidth[1]}
                            step={4}
                            suffix="px"
                            value={preferences.sidebarWidth}
                            onNumberChange={(v) => {
                                const [min, max] = NUMBER_RANGES.sidebarWidth;
                                if (Number.isFinite(v)) setPreferences({ sidebarWidth: Math.min(max, Math.max(min, Math.round(v))) });
                            }}
                        />
                    </Row>
                )}
                <SwitchRow label="菜单手风琴" hint="同级只展开一个子菜单" field="sidebarAccordion" />
                <SwitchRow label="悬停展开侧边栏" hint="侧边栏收起时，鼠标移入临时展开，移开自动收起" field="sidebarHoverTrigger" />
                <SwitchRow label="菜单自动滚动到可视区" field="scrollMenuIntoView" />
                <SwitchRow label="菜单搜索" hint="侧边栏顶部按名称搜索菜单，回车跳转" field="showMenuSearch" />
                <SwitchRow label="分组标题吸顶" hint="侧边栏滚动时一级目录标题固定在顶部" field="sidebarStickyScroll" />
                <SelectRow
                    label="页面切换动画"
                    hint="切换路由时内容区的进场动画；开启了页面缓存的页面不参与"
                    field="routeAnimation"
                    options={[
                        ['none', '无'],
                        ['fade', '淡入'],
                        ['slide-up', '上滑'],
                        ['slide-left', '左滑'],
                    ]}
                />
                <Row label="固定内容宽度" hint="开启后内容区最大宽度 1400px 并居中，适合宽屏">
                    <Switch
                        aria-label="固定内容宽度"
                        checked={preferences.contentWidth === 'fixed'}
                        onChange={(v) => setPreferences({ contentWidth: v ? 'fixed' : 'fluid' })}
                    />
                </Row>
            </Section>

            <Section title="页签">
                <SwitchRow label="启用多页签" field="enableTabs" />
                {preferences.enableTabs && (
                    <>
                        <SwitchRow label="保存页签" hint="刷新页面后恢复上次打开的页签" field="keepTabs" />
                        <SwitchRow
                            label="页面缓存"
                            hint="菜单开启了「缓存」的页面，切换页签时保留筛选、分页、滚动位置；关闭页签即释放"
                            field="enablePageCache"
                        />
                        <Row label="页签风格">
                            <RadioGroup
                                type="button"
                                aria-label="页签风格"
                                value={preferences.tabStyle}
                                onChange={(e) => setPreferences({ tabStyle: e.target.value as UserPreferences['tabStyle'] })}
                            >
                                <Radio value="line">下划线</Radio>
                                <Radio value="pill">胶囊</Radio>
                                <Radio value="card">卡片</Radio>
                            </RadioGroup>
                        </Row>
                        <SelectRow
                            label="页签动画"
                            hint="打开、关闭页签时页签本身的进出场动画"
                            field="tabAnimation"
                            options={[
                                ['none', '无'],
                                ['fade', '淡入淡出'],
                                ['slide', '滑入滑出'],
                                ['scale', '缩放'],
                            ]}
                        />
                        <SwitchRow label="页签显示图标" field="showTabIcon" />
                        <SwitchRow label="显示页签切换器" field="showTabSwitcher" />
                        <Row label="最大页签数" hint="含首页；超出后按下面的策略自动关闭">
                            <InputNumber
                                aria-label="最大页签数"
                                size="small"
                                style={{ width: 100 }}
                                min={NUMBER_RANGES.tabsMaxCount[0]}
                                max={NUMBER_RANGES.tabsMaxCount[1]}
                                value={preferences.tabsMaxCount}
                                onNumberChange={(v) => {
                                    const [min, max] = NUMBER_RANGES.tabsMaxCount;
                                    if (Number.isFinite(v)) setPreferences({ tabsMaxCount: Math.min(max, Math.max(min, Math.round(v))) });
                                }}
                            />
                        </Row>
                        <Row label="超限关闭策略" hint="FIFO：关闭最早打开的；LRU：关闭最久未使用的">
                            <RadioGroup
                                type="button"
                                aria-label="超限关闭策略"
                                value={preferences.tabEvictPolicy}
                                onChange={(e) => setPreferences({ tabEvictPolicy: e.target.value as UserPreferences['tabEvictPolicy'] })}
                            >
                                <Radio value="fifo">FIFO</Radio>
                                <Radio value="lru">LRU</Radio>
                            </RadioGroup>
                        </Row>
                        <Row label="新页签位置">
                            <RadioGroup
                                type="button"
                                aria-label="新页签位置"
                                value={preferences.openTabBehavior}
                                onChange={(e) => setPreferences({ openTabBehavior: e.target.value as UserPreferences['openTabBehavior'] })}
                            >
                                <Radio value="append">末尾</Radio>
                                <Radio value="insert-next">当前之后</Radio>
                            </RadioGroup>
                        </Row>
                        <Row label="双击页签">
                            <RadioGroup
                                type="button"
                                aria-label="双击页签"
                                value={preferences.tabDoubleClickAction}
                                onChange={(e) =>
                                    setPreferences({ tabDoubleClickAction: e.target.value as UserPreferences['tabDoubleClickAction'] })
                                }
                            >
                                <Radio value="refresh">刷新</Radio>
                                <Radio value="close">关闭</Radio>
                                <Radio value="none">无</Radio>
                            </RadioGroup>
                        </Row>
                    </>
                )}
            </Section>

            <Section title="面包屑">
                <SwitchRow label="显示面包屑" field="showBreadcrumb" />
                {preferences.showBreadcrumb && (
                    <>
                        <SwitchRow label="从首页开始" field="breadcrumbShowHome" />
                        <SwitchRow label="面包屑图标" field="breadcrumbIcon" />
                        <SwitchRow label="面包屑可点击" hint="关闭后只展示路径，避免误点打断正在填写的表单" field="breadcrumbClickable" />
                        <SwitchRow label="目录子菜单" hint="鼠标悬停面包屑里的目录，弹出它的子菜单" field="breadcrumbSubMenu" />
                    </>
                )}
            </Section>

            <Section title="表格">
                <Row label="表格尺寸">
                    <RadioGroup
                        type="button"
                        aria-label="表格尺寸"
                        value={preferences.tableSize}
                        onChange={(e) => setPreferences({ tableSize: e.target.value as TableSizePreference })}
                    >
                        <Radio value="small">紧凑</Radio>
                        <Radio value="middle">适中</Radio>
                        <Radio value="default">宽松</Radio>
                    </RadioGroup>
                </Row>
                <SwitchRow label="表格边框" field="tableBordered" />
                <SwitchRow label="斑马纹" field="tableStriped" />
                <SwitchRow label="列设置" hint="列表右上角出现列设置按钮，可隐藏列、调整顺序（按页面记在本机）" field="showTableColumnSettings" />
                <Row label="默认分页大小">
                    <Select
                        aria-label="默认分页大小"
                        size="small"
                        style={{ width: 100 }}
                        value={preferences.tablePageSize}
                        onChange={(v) => setPreferences({ tablePageSize: Number(v) })}
                        optionList={PAGE_SIZE_OPTIONS.map((v) => ({ value: v, label: `${v} 条` }))}
                    />
                </Row>
            </Section>

            <Section title="其它">
                <SwitchRow label="动态标题" hint="浏览器标签页显示「页面名 - 应用名」" field="dynamicTitle" />
                <SwitchRow label="全屏按钮" field="showFullscreen" />
                <SwitchRow label="回到顶部按钮" field="showBackTop" />
                <SwitchRow label="收藏菜单" hint="面包屑旁的星标收藏当前页，顶栏星标按钮查看全部收藏" field="showFavorites" />
                <SwitchRow label="锁屏" hint="顶栏锁形按钮或 Alt+L 锁定屏幕，输入登录密码解锁" field="enableLockScreen" />
                <Row label="灰色模式" hint="国家公祭日等场景，全局去色">
                    <Switch
                        aria-label="灰色模式"
                        checked={preferences.grayscale}
                        onChange={(v) => setPreferences({ grayscale: v, ...(v ? { colorBlind: false } : {}) })}
                    />
                </Row>
                <Row label="色弱模式" hint="提高界面对比度与饱和度">
                    <Switch
                        aria-label="色弱模式"
                        checked={preferences.colorBlind}
                        onChange={(v) => setPreferences({ colorBlind: v, ...(v ? { grayscale: false } : {}) })}
                    />
                </Row>
            </Section>
        </SideSheet>
    );
}
