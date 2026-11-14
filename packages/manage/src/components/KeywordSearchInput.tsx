import { Input } from '@douyinfe/semi-ui';

/** 快捷与高级筛选共用字段，只更新调用方草稿，不自行发请求。 */
export function KeywordSearchInput({ value, onChange, onSearch, compact = false }: {
    value: string;
    onChange: (keyword: string) => void;
    onSearch: () => void;
    compact?: boolean;
}) {
    return <Input aria-label="关键字（用户名 / 昵称 / 手机）" placeholder="用户名 / 昵称 / 手机" value={value}
        onChange={onChange} onEnterPress={onSearch} showClear style={{ width: compact ? 240 : '100%' }} />;
}
