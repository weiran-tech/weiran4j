import { Switch, Typography } from '@douyinfe/semi-ui';
import React, { useState } from 'react';
import { NavListItem, NavListPanel } from '@/components/NavListPanel';
import { PageContainer } from '@/components/PageContainer';
import { SystemConfigGroupForm } from '@/components/SystemConfigGroupForm';
import type { ConfigFieldType, ConfigSaveRequest, ConfigView } from '@/types/api';
import { usePermission } from '@/hooks/usePermission';
import { useLocalUpload } from '../LocalExampleProviders';
import './demo.css';

interface DemoGroup {
    key: string;
    label: string;
    note: string;
    fieldType?: ConfigFieldType;
    variants: ConfigView[];
}

let nextId = -1;

function example(
    group: string,
    name: string,
    fieldType: ConfigFieldType,
    configValue: string,
    required = false,
    fieldOptions: string | null = null,
): ConfigView {
    const id = nextId--;
    return {
        id,
        configKey: `system.${group}.sample_${-id}`,
        configValue,
        configType: fieldType === 'number' ? 'number' : fieldType === 'switch' ? 'boolean' : fieldType === 'json' || fieldType === 'files' ? 'json' : 'string',
        groupKey: group,
        fieldType,
        fieldOptions,
        required,
        description: name,
        isBuiltin: false,
        createdAt: '',
        updatedAt: '',
    };
}

const SELECT_OPTIONS = '[{"label":"本地","value":"local"},{"label":"阿里云","value":"aliyun"}]';

const GROUPS: DemoGroup[] = [
    { key: 'input', label: '单行输入', note: '普通值、空值与必填校验。', fieldType: 'input', variants: [
        example('demo_input', '普通输入', 'input', 'Weiran Admin'),
        example('demo_input', '必填输入', 'input', '', true),
    ] },
    { key: 'textarea', label: '多行文本', note: '多行内容与必填校验。', fieldType: 'textarea', variants: [
        example('demo_textarea', '多行内容', 'textarea', '第一行\n第二行'),
        example('demo_textarea', '必填多行', 'textarea', '', true),
    ] },
    { key: 'number', label: '数字', note: '数值输入与非法数字校验。', fieldType: 'number', variants: [
        example('demo_number', '普通数字', 'number', '42'),
        example('demo_number', '必填数字', 'number', '', true),
    ] },
    { key: 'switch', label: '开关', note: '开启与关闭两种初始状态。', fieldType: 'switch', variants: [
        example('demo_switch', '默认开启', 'switch', 'true'),
        example('demo_switch', '默认关闭', 'switch', 'false'),
    ] },
    { key: 'select', label: '下拉选择', note: '选项、空值与必填校验。', fieldType: 'select', variants: [
        example('demo_select', '已选择', 'select', 'local', false, SELECT_OPTIONS),
        example('demo_select', '必填选择', 'select', '', true, SELECT_OPTIONS),
    ] },
    { key: 'json', label: 'JSON', note: '对象内容与 JSON 格式校验。', fieldType: 'json', variants: [
        example('demo_json', 'JSON 对象', 'json', '{"enabled":true,"limit":10}'),
        example('demo_json', 'JSON 数组', 'json', '[]'),
    ] },
    { key: 'file', label: '单文件上传', note: '上传、替换、预览、移除和只读状态。', fieldType: 'file', variants: [
        example('demo_file', '单文件', 'file', ''),
    ] },
    { key: 'files', label: '多文件上传', note: '批量上传、排序、预览及最多 9 个文件。', fieldType: 'files', variants: [
        example('demo_files', '多文件', 'files', '[]'),
    ] },
    { key: 'image', label: '单图上传', note: '查看图片缩略图、替换与预览，只接受图片格式。', fieldType: 'image', variants: [
        example('demo_image', '单图', 'image', ''),
    ] },
    { key: 'video', label: '视频上传', note: '只接受视频格式，支持播放、替换与移除。', fieldType: 'video', variants: [
        example('demo_video', '单视频', 'video', ''),
    ] },
    { key: 'richtext', label: '富文本', note: '编辑文本、上传图片与视频，以及只读状态。', fieldType: 'richtext', variants: [
        example('demo_richtext', '富文本内容', 'richtext', '<p><strong>富文本示例</strong>：支持标题、加粗和列表。</p>'),
    ] },
    { key: 'upload', label: '上传组合', note: '单文件、多文件、单图、视频和富文本共用一个保存操作，可观察多个上传组件同时工作时的状态。图片与视频可组合成一个上传入口。', variants: [
        example('demo_upload', '单文件上传', 'file', ''),
        example('demo_upload', '多文件上传', 'files', '[]'),
        example('demo_upload', '单图上传', 'image', ''),
        example('demo_upload', '视频上传', 'video', ''),
        example('demo_upload', '图片＋视频上传', 'files', '[]', false, '["image","video"]'),
        example('demo_upload', '富文本图片与视频', 'richtext', '<p>上传组合示例</p>'),
    ] },
    { key: 'special', label: '特殊验证', note: '每个场景独立提交，方便逐项核对错误提示。', variants: [
        example('demo_special', '必填内容', 'input', '', true),
        example('demo_special', '数字边界', 'number', '0', true),
        example('demo_special', '无效选项', 'select', 'unknown', false, SELECT_OPTIONS),
        example('demo_special', 'JSON 格式', 'json', '{invalid', true),
        example('demo_special', '上传格式与大小', 'file', ''),
        example('demo_special', '最多 9 个文件', 'files', '[]'),
    ] },
];

const SPECIAL_NOTES = [
    '留空提交应提示必填。',
    '将数值改为不合法内容后提交，应提示数字格式错误。',
    '初始值不在选项列表中，提交应提示选项无效。',
    '初始值不是合法 JSON，提交应提示格式错误。',
    '选择未启用格式、空文件或超过后台大小限制的文件，应在上传前提示。',
    '连续选择文件，达到 9 个后应隐藏上传入口并阻止继续添加。',
];

export default function DemoConfigPage() {
    const { hasPermission } = usePermission();
    const [selected, setSelected] = useState('input');
    const [readonly, setReadonly] = useState(false);
    const [failSave, setFailSave] = useState(false);
    const [failUpload, setFailUpload] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState<Record<string, string>>({});
    const upload = useLocalUpload(failUpload);
    const group = GROUPS.find((item) => item.key === selected) ?? GROUPS[0]!;
    const variants = group.variants.map((record) => ({ ...record, configValue: saved[record.configKey] ?? record.configValue }));
    const save = (values: ConfigSaveRequest[]) => {
        if (failSave) { setError('模拟保存失败，输入保留；关闭失败开关后可重试。'); throw new Error('模拟保存失败'); }
        setError('');
        setSaved((current) => ({ ...current, ...Object.fromEntries(values.map((item) => [item.configKey, item.configValue])) }));
    };
    const form = (records: ConfigView[], key: string) => <SystemConfigGroupForm
        key={`${key}:${readonly}`} records={records} canEdit={!readonly && hasPermission('system:config:update')} showSettings={false}
        onEdit={() => undefined} onSave={save} successMessage="示例值已保存到当前页面"
        onUploadFile={upload} onUploadImage={upload}
    />;
    return <div className="demo-config-layout">
        <NavListPanel title="组件类型" dataSource={GROUPS} renderItem={(item) => <NavListItem
            key={item.key} active={item.key === selected} primary={item.label} onClick={() => { setSelected(item.key); setError(''); }}
        />} />
        <PageContainer title={`${group.label} · 组件演示`}>
            <div className="demo-config__content">
                <Typography.Text type="tertiary">{group.note} 保存仅影响当前页面，刷新后重置；上传使用浏览器临时 URL。</Typography.Text>
                <label className="demo-config__readonly"><Switch checked={readonly} onChange={setReadonly} aria-label="只读状态" />只读状态</label>
                <label className="demo-config__readonly"><Switch checked={failSave} onChange={setFailSave} aria-label="模拟保存失败" />模拟保存失败</label>
                <label className="demo-config__readonly"><Switch checked={failUpload} onChange={setFailUpload} aria-label="模拟上传失败" />模拟上传失败</label>
                {error && <Typography.Text type="danger">{error}</Typography.Text>}
                {group.key === 'special' ? variants.map((record, index) => <section key={record.id} className="demo-config__case">
                    <Typography.Text type="tertiary">{SPECIAL_NOTES[index]}</Typography.Text>{form([record], String(record.id))}
                </section>) : form(variants, group.key)}
                <details><summary>查看当前页面保存值</summary><pre>{JSON.stringify(saved, null, 2)}</pre></details>
            </div>
        </PageContainer>
    </div>;
}
