/** @jsxRuntime automatic */
import { useSingleFlightCallback } from '@/hooks/useActionGuard';
import { Button, Form, Space, Tag, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useFormApi } from '@douyinfe/semi-ui/lib/es/form';
import { Settings } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ALL_UPLOAD_TYPES, FileUpload, type UploadType } from '@/components/FileUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SystemImageUpload } from '@/components/SystemImageUpload';
import { useSaveConfig } from '@/hooks/queries/configs';
import type { ConfigSaveRequest, ConfigView } from '@/types/api';

/** 本地短信正文与变量插入，共用 Semi Form 的值和校验。 */
export function LocalSmsTemplateField({ field, label, disabled = false, required = false, multiline = true }: {
    field: string;
    label: ReactNode;
    disabled?: boolean;
    required?: boolean;
    multiline?: boolean;
}) {
    const form = useFormApi<Record<string, unknown>>();
    const container = useRef<HTMLDivElement>(null);
    const focused = useRef(false);
    const TextField = multiline ? Form.TextArea : Form.Input;
    const insertCode = () => {
        const input = container.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea, input');
        if (disabled || !input) return;
        const start = focused.current ? (input.selectionStart ?? input.value.length) : input.value.length;
        const end = focused.current ? (input.selectionEnd ?? start) : input.value.length;
        const value = input.value.slice(0, start) + '${code}' + input.value.slice(end);
        if (value.length > 65535) {
            Toast.warning('模板最多 65535 个字符，请先缩短正文');
            return;
        }
        form.setValue(field, value);
        requestAnimationFrame(() => {
            if (!input.isConnected) return;
            input.focus();
            input.setSelectionRange(start + '${code}'.length, start + '${code}'.length);
        });
    };
    return <div ref={container}>
        <TextField
            field={field}
            fieldStyle={{ padding: 0 }}
            label={label}
            disabled={disabled}
            {...(multiline ? { rows: 3 } : {})}
            maxLength={65535}
            rules={required ? [{ required: true, message: '此项必填' }] : []}
            onFocus={() => { focused.current = true; }}
            extraText={<div>
                <div>变量格式为 {'${变量名}'}，模板须包含 {'${code}'}，发送时替换为 6 位验证码。</div>
                <Space spacing={4} wrap>
                    <span>点击插入：</span>
                    <Button
                        size="small"
                        theme="borderless"
                        htmlType="button"
                        disabled={disabled}
                        aria-label="插入验证码变量"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={insertCode}
                    >验证码 {'${code}'}</Button>
                    <span>插入光标处，选中文字时替换选中内容。</span>
                </Space>
            </div>}
        />
    </div>;
}

export function parseConfigFieldOptions(value: string): Array<{ label: string; value: string }> {
    if (!value.trim()) return [];
    try {
        const options: unknown = JSON.parse(value);
        if (!Array.isArray(options)) return [];
        return options.filter((option: unknown): option is { label: string; value: string } => {
            if (typeof option !== 'object' || option === null) return false;
            const candidate = option as Record<string, unknown>;
            return typeof candidate.label === 'string' && typeof candidate.value === 'string';
        });
    } catch {
        return [];
    }
}

export function parseUploadTypes(value: string | null, fallback: readonly UploadType[]): readonly UploadType[] {
    if (!value) return fallback;
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) return fallback;
        const types: unknown[] = parsed;
        if (types.length === 0 || !types.every((item): item is UploadType => typeof item === 'string' && ALL_UPLOAD_TYPES.includes(item as UploadType))) return fallback;
        return [...new Set(types)];
    } catch {
        return fallback;
    }
}

function toTextValue(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

function toStringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function readFiles(value: string): string[] {
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

function isFilesField(record: ConfigView): boolean {
    return record.fieldType === 'files' || (record.configKey === 'system.demo.images' && record.fieldType === 'json');
}

function ConfigFileField({
    value,
    disabled,
    uploadTypes,
    onUpload,
    onUploadingChange,
    onChange,
}: {
    value: string;
    disabled: boolean;
    uploadTypes: readonly UploadType[];
    onUpload?: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
    onUploadingChange: (active: boolean) => void;
    onChange: (url: string) => void;
}) {
    const [currentValue, setCurrentValue] = useState(value);
    return <FileUpload
        value={currentValue}
        disabled={disabled}
        uploadTypes={uploadTypes}
        {...(onUpload ? { onUpload } : {})}
        onUploadingChange={onUploadingChange}
        onChange={(url) => { setCurrentValue(url); onChange(url); }}
    />;
}

function ConfigMultiFileField({
    value,
    disabled,
    uploadTypes,
    onUpload,
    onUploadingChange,
    onChange,
}: {
    value: string;
    disabled: boolean;
    uploadTypes: readonly UploadType[];
    onUpload?: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
    onUploadingChange: (active: boolean) => void;
    onChange: (value: string) => void;
}) {
    const [files, setFiles] = useState(() => readFiles(value));
    return <FileUpload
        multiple
        value={files}
        disabled={disabled}
        uploadTypes={uploadTypes}
        {...(onUpload ? { onUpload } : {})}
        onUploadingChange={onUploadingChange}
        onChange={(urls) => { setFiles(urls); onChange(JSON.stringify(urls)); }}
    />;
}

function validateField(record: ConfigView, value: unknown): string | null {
    const text = record.fieldType === 'switch' ? String(Boolean(value)) : toTextValue(value);
    if (record.required && !text.trim()) return '此项必填';
    if (record.fieldType === 'number' && text.trim() && (text.trim() !== text || Number.isNaN(Number(text)))) {
        return '请输入合法数字';
    }
    if (record.fieldType === 'switch' && text !== 'true' && text !== 'false') return '请选择开或关';
    if (isFilesField(record)) {
        try {
            const files: unknown = JSON.parse(text);
            if (!Array.isArray(files) || !files.every((file) => typeof file === 'string' && file.length > 0) || files.length > 9) return '请上传最多 9 个文件';
        } catch {
            return '文件列表格式不正确';
        }
    } else if (record.fieldType === 'json') {
        try {
            JSON.parse(text);
        } catch {
            return 'JSON 格式不正确';
        }
    }
    if (record.fieldType === 'select' && text && !parseConfigFieldOptions(record.fieldOptions ?? '').some((option) => option.value === text)) {
        return '请选择有效选项';
    }
    return null;
}

export function SystemConfigGroupForm({
    records,
    canEdit,
    disabled = false,
    successMessage,
    showSettings,
    onEdit,
    onSave,
    onUploadFile,
    onUploadImage,
}: {
    records: ConfigView[];
    canEdit: boolean;
    disabled?: boolean;
    successMessage?: string;
    showSettings: boolean;
    onEdit: (record: ConfigView) => void;
    onSave?: (values: ConfigSaveRequest[]) => Promise<void> | void;
    onUploadFile?: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
    onUploadImage?: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
}) {
    const api = useRef<FormApi<Record<string, unknown>> | null>(null);
    const save = useSaveConfig();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const uploadingFields = useRef(new Set<number>());
    const setFieldUploading = (id: number, active: boolean) => {
        if (active) uploadingFields.current.add(id);
        else uploadingFields.current.delete(id);
        setUploading(uploadingFields.current.size > 0);
    };
    const initValues = useMemo(
        () => Object.fromEntries(records.map((record) => [String(record.id), record.fieldType === 'switch' ? record.configValue === 'true' : record.configValue])),
        [records],
    );

    const submit = useSingleFlightCallback(async () => {
        if (!canEdit || disabled || uploadingFields.current.size > 0) return;
        const values = await api.current?.validate();
        if (!values) return;
        for (const record of records) {
            const raw = values[String(record.id)];
            const error = validateField(record, raw);
            if (error) {
                Toast.error(`${record.description || record.configKey}：${error}`);
                return;
            }
        }
        const requests: ConfigSaveRequest[] = records.map((record) => {
            const value = values[String(record.id)];
            return {
                configKey: record.configKey,
                configValue: record.fieldType === 'switch' ? String(Boolean(value)) : toTextValue(value).trim(),
                configType: record.configType,
                groupKey: record.groupKey,
                fieldType: record.fieldType,
                fieldOptions: record.fieldOptions,
                required: record.required,
                description: record.description,
            };
        });
        setSaving(true);
        try {
            if (onSave) {
                await onSave(requests);
            } else {
                await Promise.all(records.map((record, index) => save.mutateAsync({ id: record.id, body: requests[index]! })));
            }
            Toast.success(successMessage ?? (onSave ? '示例值已保存到数据库' : '分组配置已保存'));
        } finally {
            setSaving(false);
        }
    });

    return (
        <Form<Record<string, unknown>>
            style={{ width: '100%' }}
            getFormApi={(formApi) => {
                api.current = formApi;
            }}
            initValues={initValues}
            labelPosition="top"
        >
            <Space vertical align="start" style={{ width: '100%' }} spacing={16}>
                {records.map((record) => {
                    const field = String(record.id);
                    const label = (
                        <div className="config-field-title">
                            {canEdit && showSettings && (
                                <Button
                                    disabled={disabled}
                                    className="config-field-title__edit"
                                    theme="borderless"
                                    size="small"
                                    icon={<Settings size={14} />}
                                    aria-label={`字段设置：${record.description || record.configKey}`}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onEdit(record);
                                    }}
                                />
                            )}
                            <span>{record.description || '未命名配置项'}</span>
                            {record.isBuiltin && <Tag size="small" color="blue">内置</Tag>}
                        </div>
                    );
                    const common = {
                        field,
                        label,
                        fieldStyle: { padding: 0 },
                        disabled: !canEdit || disabled,
                        rules: record.required ? [{ required: true, message: '此项必填' }] : [],
                    };
                    return (
                        <div key={record.id} style={{ width: '100%' }}>
                            {record.configKey === 'sms.system_tpl.captcha_local' && (record.fieldType === 'textarea' || record.fieldType === 'input') ? (
                                <LocalSmsTemplateField field={field} label={label} disabled={!canEdit || disabled} required={record.required} multiline={record.fieldType === 'textarea'} />
                            ) : record.fieldType === 'textarea' ? (
                                <Form.TextArea {...common} rows={3} maxLength={65535} />
                            ) : record.fieldType === 'number' ? (
                                <Form.Input {...common} type="number" />
                            ) : record.fieldType === 'switch' ? (
                                <Form.Switch {...common} />
                            ) : record.fieldType === 'select' ? (
                                <Form.Select {...common} optionList={parseConfigFieldOptions(record.fieldOptions ?? '')} style={{ width: '100%' }} />
                            ) : isFilesField(record) ? (
                                <div>
                                    <Form.Input field={field} noLabel style={{ display: 'none' }} />
                                    <div style={{ marginBottom: 8 }}>{label}</div>
                                    <ConfigMultiFileField
                                        key={`${record.id}:${record.configValue}`}
                                        value={toStringValue(initValues[field])}
                                        disabled={!canEdit || disabled}
                                        uploadTypes={parseUploadTypes(record.fieldOptions, ALL_UPLOAD_TYPES)}
                                        {...(onUploadFile ? { onUpload: onUploadFile } : {})}
                                        onUploadingChange={(active) => setFieldUploading(record.id, active)}
                                        onChange={(value) => { api.current?.setValue(field, value); }}
                                    />
                                </div>
                            ) : record.fieldType === 'json' ? (
                                <Form.TextArea {...common} rows={5} maxLength={65535} />
                            ) : record.fieldType === 'file' || record.fieldType === 'image' || record.fieldType === 'video' ? (
                                <div>
                                    <Form.Input field={field} noLabel style={{ display: 'none' }} />
                                    <div style={{ marginBottom: 8 }}>{label}</div>
                                    {record.fieldType === 'image' ? <SystemImageUpload
                                        key={`${record.id}:${record.configValue}`}
                                        value={toStringValue(initValues[field])}
                                        disabled={!canEdit || disabled}
                                        {...(onUploadFile ? { onUpload: onUploadFile } : {})}
                                        onUploadingChange={(active) => setFieldUploading(record.id, active)}
                                        onChange={(url) => { api.current?.setValue(field, url); }}
                                    /> : <ConfigFileField
                                        key={`${record.id}:${record.configValue}`}
                                        value={toStringValue(initValues[field])}
                                        disabled={!canEdit || disabled}
                                        uploadTypes={record.fieldType === 'file' ? parseUploadTypes(record.fieldOptions, ['file']) : [record.fieldType]}
                                        {...(onUploadFile ? { onUpload: onUploadFile } : {})}
                                        onUploadingChange={(active) => setFieldUploading(record.id, active)}
                                        onChange={(url) => {
                                            api.current?.setValue(field, url);
                                        }}
                                    />}
                                </div>
                            ) : record.fieldType === 'richtext' ? (
                                <div>
                                    <Form.Input field={field} noLabel style={{ display: 'none' }} />
                                    <div style={{ marginBottom: 8 }}>{label}</div>
                                    <RichTextEditor
                                        key={record.id}
                                        value={toStringValue(initValues[field])}
                                        disabled={!canEdit || disabled}
                                        label={record.description || record.configKey}
                                        {...(onUploadImage ? { onUploadImage } : {})}
                                        onUploadingChange={(active) => setFieldUploading(record.id, active)}
                                        onChange={(html) => {
                                            api.current?.setValue(field, html);
                                        }}
                                    />
                                </div>
                            ) : (
                                <Form.Input {...common} maxLength={65535} />
                            )}
                        </div>
                    );
                })}
                {canEdit && (
                    <Button type="primary" theme="solid" loading={saving || save.isPending} disabled={disabled || uploading} onClick={() => void submit().catch(() => undefined)}>
                        保存本组
                    </Button>
                )}
            </Space>
        </Form>
    );
}
