import { Select } from '@douyinfe/semi-ui';
import type { CSSProperties } from 'react';
import { useDictOptions } from '@/hooks/queries/dicts';

interface DictSelectProps {
    dictCode: string;
    value?: string | undefined;
    onChange?: (value: string | undefined) => void;
    placeholder?: string;
    style?: CSSProperties;
    showClear?: boolean;
}

/**
 * 字典下拉（筛选栏等非表单场景）。
 * 表单里直接用 `<Form.Select optionList={useDictOptions(code)} />`，校验与取值更顺手。
 */
export function DictSelect({ dictCode, value, onChange, placeholder = '请选择', style, showClear = true }: DictSelectProps) {
    const options = useDictOptions(dictCode);
    return (
        <Select
            value={value}
            onChange={(v) => onChange?.(typeof v === 'string' ? v : undefined)}
            optionList={options}
            placeholder={placeholder}
            style={style ?? { width: 140 }}
            showClear={showClear}
        />
    );
}
