import { Select } from '@douyinfe/semi-ui';
import type { CSSProperties } from 'react';

export interface OptionSelectOption {
    label: string;
    value: string;
    disabled?: boolean | undefined;
}

export interface OptionSelectProps {
    options: readonly OptionSelectOption[];
    value?: string | undefined;
    onChange?: ((value: string | undefined) => void) | undefined;
    placeholder?: string | undefined;
    style?: CSSProperties | undefined;
    showClear?: boolean | undefined;
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
}

/** 受控字符串选项控件；清空时统一回调 undefined。 */
export function OptionSelect({ options, value, onChange, placeholder = '请选择', style, showClear = true, disabled, loading }: OptionSelectProps) {
    return <Select
        value={value}
        onChange={(next) => onChange?.(typeof next === 'string' ? next : undefined)}
        optionList={options.map((option) => ({ ...option }))}
        placeholder={placeholder}
        style={style ?? { width: 140 }}
        showClear={showClear}
        disabled={disabled}
        loading={loading}
    />;
}
