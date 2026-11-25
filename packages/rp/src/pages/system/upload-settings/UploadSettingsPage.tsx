import { Button, Divider, Input, Select, Toast } from '@douyinfe/semi-ui';
import { Fragment, useState } from 'react';
import { useConfigAll, useSaveConfig } from '@/hooks/queries/configs';
import { useUploadSettings } from '@/hooks/queries/system-media';
import { usePermission } from '@/hooks/usePermission';
import type { ConfigView, SystemMediaUploadSettings } from '@/types/api';
import './UploadSettingsPage.css';

type GroupKey = 'image' | 'video' | 'file';
type Draft = Record<GroupKey, { formats: string[]; maxSizeMb: string }>;

const GROUPS: Array<{ key: GroupKey; title: string; hint: string; choices?: string[]; maximum: number }> = [
    { key: 'image', title: '图片', hint: '图片内容会校验文件签名', choices: ['gif', 'jpg', 'jpeg', 'png', 'webp'], maximum: 100 },
    { key: 'video', title: '视频', hint: '视频内容会校验文件签名', choices: ['mp4', 'webm', 'mov'], maximum: 1024 },
    { key: 'file', title: '普通文件', hint: '输入扩展名后添加；不能与图片、视频格式重复', maximum: 1024 },
];

function fromSettings(settings: SystemMediaUploadSettings): Draft {
    return {
        image: { formats: settings.imageFormats, maxSizeMb: String(settings.imageMaxSizeMb) },
        video: { formats: settings.videoFormats, maxSizeMb: String(settings.videoMaxSizeMb) },
        file: { formats: settings.fileFormats.filter((format) => !['gif', 'jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'].includes(format)), maxSizeMb: String(settings.fileMaxSizeMb) },
    };
}

function configKey(group: GroupKey, field: 'formats' | 'maxSizeMb'): string {
    return `system.upload.${group === 'file' ? 'file' : group}_${field === 'formats' ? 'formats' : 'max_size_mb'}`;
}

export default function UploadSettingsTab() {
    const { hasPermission } = usePermission();
    const canEdit = hasPermission('system:config:update');
    const { data: settings, isLoading } = useUploadSettings();
    const { data: configs } = useConfigAll();
    const save = useSaveConfig();
    const [draftOverride, setDraftOverride] = useState<Draft | null>(null);
    const draft = draftOverride ?? (settings ? fromSettings(settings) : null);

    const setGroup = (key: GroupKey, value: Draft[GroupKey]) => {
        setDraftOverride((current) => {
            const base = current ?? (settings ? fromSettings(settings) : null);
            return base ? { ...base, [key]: value } : null;
        });
    };

    const setFileFormats = (formats: string[]) => {
        if (!draft) return;
        const normalized = formats.map((format) => format.trim().toLowerCase().replace(/^\./, ''));
        if (normalized.some((format) => !/^[a-z0-9]{2,10}$/.test(format) || /^(html|htm|svg|xml|xhtml|js|mjs|css|php|phtml|jsp|asp|aspx|exe|dll|bat|cmd|sh|ps1)$/.test(format))) {
            Toast.error('扩展名须为 2～10 位小写字母或数字，且不能是可执行或网页格式');
            return;
        }
        if (normalized.some((format) => GROUPS[0]!.choices!.includes(format) || GROUPS[1]!.choices!.includes(format))) {
            Toast.error('图片或视频格式请在对应分组选择');
            return;
        }
        setGroup('file', { ...draft.file, formats: [...new Set(normalized)] });
    };

    const submit = async () => {
        if (!draft || !configs) return;
        for (const group of GROUPS) {
            const value = draft[group.key];
            const size = Number(value.maxSizeMb);
            if (value.formats.length === 0) {
                Toast.error(`${group.title}请至少保留一种格式`);
                return;
            }
            if (!Number.isInteger(size) || size < 1 || size > group.maximum) {
                Toast.error(`${group.title}大小须为 1～${group.maximum} MB 的整数`);
                return;
            }
        }
        const byKey = new Map(configs.map((config) => [config.configKey, config]));
        const changes: Array<{ record: ConfigView; value: string }> = [];
        for (const group of GROUPS) {
            for (const field of ['formats', 'maxSizeMb'] as const) {
                const record = byKey.get(configKey(group.key, field));
                if (!record) {
                    Toast.error('上传配置不完整，请检查数据库迁移');
                    return;
                }
                const value = field === 'formats' ? draft[group.key].formats.join(',') : draft[group.key].maxSizeMb;
                if (value !== record.configValue) changes.push({ record, value });
            }
        }
        try {
            for (const { record, value } of changes) {
                await save.mutateAsync({ id: record.id, body: {
                    configKey: record.configKey,
                    configValue: value,
                    configType: record.configType,
                    groupKey: record.groupKey,
                    fieldType: record.fieldType,
                    fieldOptions: record.fieldOptions,
                    required: record.required,
                    description: record.description,
                } });
            }
            Toast.success('上传配置已保存');
        } catch (error) {
            Toast.error(error instanceof Error ? error.message : '保存失败');
        }
    };

    return <div className="upload-settings">
            <p className="upload-settings__intro">上传时按扩展名匹配分组，并采用该分组的大小限制。配置对资源管理、文件上传组件和富文本编辑器生效。</p>
            {isLoading || !draft ? <p>正在加载上传配置…</p> : GROUPS.map((group, index) => {
                const value = draft[group.key];
                return <Fragment key={group.key}>
                    {index > 0 && <Divider />}
                    <section className="upload-settings__group">
                    <h3>{group.title}</h3>
                    <p>{group.hint}</p>
                    <label className="upload-settings__label">支持的格式</label>
                    {group.choices ? <Select
                        multiple
                        disabled={!canEdit}
                        value={value.formats}
                        optionList={group.choices.map((format) => ({ label: format, value: format }))}
                        onChange={(formats) => setGroup(group.key, { ...value, formats: formats as string[] })}
                        style={{ width: '100%' }}
                    /> : <Select
                        filter
                        allowCreate
                        multiple
                        disabled={!canEdit}
                        value={value.formats}
                        optionList={value.formats.map((format) => ({ label: format, value: format }))}
                        onChange={(formats) => setFileFormats(formats as string[])}
                        placeholder="输入扩展名并回车创建"
                        style={{ width: '100%' }}
                    />}
                    <label className="upload-settings__label" htmlFor={`${group.key}-size`}>单文件大小上限（MB）</label>
                    <Input id={`${group.key}-size`} type="number" min={1} max={group.maximum} value={value.maxSizeMb} disabled={!canEdit}
                        onChange={(maxSizeMb) => setGroup(group.key, { ...value, maxSizeMb })} />
                    <small>范围：1～{group.maximum} MB</small>
                    </section>
                </Fragment>;
            })}
            {canEdit && <Button type="primary" theme="solid" loading={save.isPending} disabled={!draft || !configs} onClick={() => void submit()}>保存上传配置</Button>}
        </div>;
}
