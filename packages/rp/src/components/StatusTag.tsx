import { Tag } from '@douyinfe/semi-ui';

const PRESETS: Record<string, { label: string; color: 'green' | 'grey' | 'red' }> = {
    enabled: { label: '启用', color: 'green' },
    disabled: { label: '禁用', color: 'grey' },
    success: { label: '成功', color: 'green' },
    fail: { label: '失败', color: 'red' },
};

/** 通用状态标签：enabled/disabled、success/fail，或布尔成功与否 */
export function StatusTag({ value }: { value: string | boolean | null | undefined }) {
    const key = typeof value === 'boolean' ? (value ? 'success' : 'fail') : (value ?? '');
    const preset = PRESETS[key];
    if (!preset) return <span>{key || '—'}</span>;
    return (
        <Tag color={preset.color} size="small">
            {preset.label}
        </Tag>
    );
}

export const STATUS_OPTIONS = [
    { label: '启用', value: 'enabled' },
    { label: '禁用', value: 'disabled' },
];
