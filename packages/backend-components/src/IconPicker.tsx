import { Button, Input, Popover } from '@douyinfe/semi-ui';
import { ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import './IconPicker.css';

export interface IconPickerProps {
    value?: string | null | undefined;
    onChange?: ((icon: string) => void) | undefined;
    icons: readonly string[];
    renderIcon: (name: string, size: number) => ReactNode;
    placeholder?: string | undefined;
    disabled?: boolean | undefined;
}

/** 数据驱动的图标表单控件；图标注册表由调用方提供。 */
export function IconPicker({ value, onChange, icons, renderIcon, placeholder = '选择图标', disabled = false }: IconPickerProps) {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');
    const names = useMemo(() => {
        const query = search.trim().toLowerCase();
        return query ? icons.filter((name) => name.toLowerCase().includes(query)) : icons;
    }, [icons, search]);

    const panel = <div className="weiran-icon-picker__panel">
        <Input
            size="small"
            prefix={<Search size={13} />}
            placeholder={`搜索图标（共 ${icons.length} 个）`}
            value={search}
            onChange={setSearch}
            showClear
        />
        <div className="weiran-icon-picker__grid">
            {names.map((name) => <button
                type="button"
                key={name}
                title={name}
                aria-label={name}
                aria-pressed={value === name}
                className={`weiran-icon-picker__cell${value === name ? ' weiran-icon-picker__cell--active' : ''}`}
                onClick={() => { onChange?.(name); setVisible(false); }}
            >{renderIcon(name, 18)}</button>)}
            {names.length === 0 && <div className="weiran-icon-picker__empty">无匹配图标</div>}
        </div>
    </div>;

    return <Popover
        trigger="custom"
        visible={visible && !disabled}
        onClickOutSide={() => setVisible(false)}
        content={panel}
        position="bottomLeft"
    >
        <div className="weiran-icon-picker">
            <button type="button" className="weiran-icon-picker__trigger" disabled={disabled}
                aria-label={value ? `当前图标 ${value}，选择图标` : placeholder}
                aria-expanded={visible && !disabled}
                onClick={() => setVisible((current) => !current)}>
                <span className="weiran-icon-picker__value">
                    {value ? <>{renderIcon(value, 16)}<span>{value}</span></>
                        : <span className="weiran-icon-picker__placeholder">{placeholder}</span>}
                </span>
                {!value && <ChevronDown size={14} />}
            </button>
            {value && <Button size="small" theme="borderless" type="tertiary" disabled={disabled}
                icon={<X size={12} />} aria-label="清除图标"
                onClick={(event) => { event.stopPropagation(); onChange?.(''); }} />}
        </div>
    </Popover>;
}
