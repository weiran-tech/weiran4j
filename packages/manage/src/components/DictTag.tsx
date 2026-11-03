import { Tag } from '@douyinfe/semi-ui';
import type { TagProps } from '@douyinfe/semi-ui/lib/es/tag';
import { useDictItemsByCode } from '@/hooks/queries/dicts';

interface DictTagProps {
    /** 字典编码，如 `sys_user_gender` */
    dictCode: string;
    value: string | null | undefined;
}

/** 按字典项渲染带颜色的标签；字典未加载或无此项时显示原值 */
export function DictTag({ dictCode, value }: DictTagProps) {
    const { data } = useDictItemsByCode(dictCode);
    if (value === null || value === undefined || value === '') return <span>—</span>;
    const item = data?.find((i) => i.value === value);
    const color = (item?.color || 'grey') as TagProps['color'];
    return (
        <Tag color={color} size="small">
            {item?.label ?? value}
        </Tag>
    );
}
