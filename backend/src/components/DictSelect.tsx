import { OptionSelect } from '@weiran-tech/backend-components';
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

/** 字典数据适配层；表单里也可直接传 optionList 给 Semi Form.Select。 */
export function DictSelect({ dictCode, value, onChange, placeholder, style, showClear }: DictSelectProps) {
    const options = useDictOptions(dictCode);
    return <OptionSelect options={options} value={value} onChange={onChange} placeholder={placeholder} style={style} showClear={showClear} />;
}
