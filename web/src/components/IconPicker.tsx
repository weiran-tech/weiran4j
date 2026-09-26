import { Button, Input, Popover } from '@douyinfe/semi-ui';
import { ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MENU_ICON_NAMES, renderIcon } from '@/utils/icons';

interface IconPickerProps {
    value?: string | null | undefined;
    onChange?: (icon: string) => void;
}

/** 菜单图标选择器：弹层网格 + 搜索；配合 Semi `withField` 可直接作为表单项 */
export function IconPicker({ value, onChange }: IconPickerProps) {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const names = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? MENU_ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : MENU_ICON_NAMES;
    }, [search]);

    const panel = (
        <div style={{ width: 320, padding: 8 }}>
            <Input
                size="small"
                prefix={<Search size={13} />}
                placeholder={`搜索图标（共 ${MENU_ICON_NAMES.length} 个）`}
                value={search}
                onChange={setSearch}
                showClear
            />
            <div className="icon-picker-grid">
                {names.map((name) => (
                    <button
                        type="button"
                        key={name}
                        title={name}
                        aria-label={name}
                        className={`icon-picker-cell${value === name ? ' icon-picker-cell--active' : ''}`}
                        onClick={() => {
                            onChange?.(name);
                            setVisible(false);
                        }}
                    >
                        {renderIcon(name, 18)}
                    </button>
                ))}
                {names.length === 0 && <div className="icon-picker-empty">无匹配图标</div>}
            </div>
        </div>
    );

    return (
        <Popover
            trigger="custom"
            visible={visible}
            onClickOutSide={() => setVisible(false)}
            content={panel}
            position="bottomLeft"
        >
            <div className="icon-picker-trigger" onClick={() => setVisible((v) => !v)} role="button" tabIndex={0}>
                <span className="icon-picker-trigger__value">
                    {value ? (
                        <>
                            {renderIcon(value)}
                            <span>{value}</span>
                        </>
                    ) : (
                        <span className="icon-picker-trigger__placeholder">选择图标</span>
                    )}
                </span>
                {value ? (
                    <Button
                        size="small"
                        theme="borderless"
                        type="tertiary"
                        icon={<X size={12} />}
                        aria-label="清除图标"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange?.('');
                        }}
                    />
                ) : (
                    <ChevronDown size={14} />
                )}
            </div>
        </Popover>
    );
}
