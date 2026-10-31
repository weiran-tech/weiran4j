import { Spin, Switch, Typography } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { NavListItem, NavListPanel } from '@/components/NavListPanel';
import { PageContainer } from '@/components/PageContainer';
import { SystemConfigGroupForm } from '@/components/SystemConfigGroupForm';
import { useConfigAll } from '@/hooks/queries/configs';
import { usePermission } from '@/hooks/usePermission';
import type { ConfigFieldType, ConfigSaveRequest, ConfigView } from '@/types/api';
import './demo.css';

const DEMO_PREFIX = 'system.demo.';

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
    { key: 'image', label: '单图上传', note: '查看图片缩略图、替换与预览；当前复用单文件上传控件。', fieldType: 'image', variants: [
        example('demo_image', '单图', 'image', ''),
    ] },
    { key: 'richtext', label: '富文本', note: '编辑文本、上传图片与视频，以及只读状态。', fieldType: 'richtext', variants: [
        example('demo_richtext', '富文本内容', 'richtext', '<p><strong>富文本示例</strong>：支持标题、加粗和列表。</p>'),
    ] },
    { key: 'upload', label: '上传组合', note: '单文件、多文件、单图、视频和富文本共用一个保存操作，可观察多个上传组件同时工作时的状态。视频示例复用单文件控件。', variants: [
        example('demo_upload', '单文件上传', 'file', ''),
        example('demo_upload', '多文件上传', 'files', '[]'),
        example('demo_upload', '单图上传', 'image', ''),
        example('demo_upload', '视频上传（单文件控件）', 'file', ''),
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
    const query = useConfigAll();
    const { hasPermission } = usePermission();
    const [selected, setSelected] = useState('input');
    const [readonly, setReadonly] = useState(false);
    const [saved, setSaved] = useState<Record<string, string>>({});
    const group = GROUPS.find((item) => item.key === selected) ?? GROUPS[0]!;
    const records = (query.data ?? []).filter((record) => record.configKey.startsWith(DEMO_PREFIX));
    const actualRecords = group.fieldType ? records.filter((record) => record.fieldType === group.fieldType) : [];
    const canEdit = hasPermission('system:config:update');
    const variants = group.variants.map((record) => ({ ...record, configValue: saved[record.configKey] ?? record.configValue }));
    const savedValues = group.variants.filter((record) => record.configKey in saved).map((record) => ({
        key: record.configKey,
        value: saved[record.configKey],
    }));
    const saveVariants = (values: ConfigSaveRequest[]) => {
        setSaved((previous) => ({ ...previous, ...Object.fromEntries(values.map((value) => [value.configKey, value.configValue])) }));
    };

    return (
        <div className="config-groups-layout">
            <div className="config-groups-layout__master">
                <NavListPanel
                    title="组件类型"
                    dataSource={GROUPS}
                    renderItem={(item) => <NavListItem
                        key={item.key}
                        active={item.key === group.key}
                        primary={item.label}
                        secondary={item.key}
                        onClick={() => { setSelected(item.key); setReadonly(false); }}
                    />}
                />
            </div>
            <PageContainer title={`${group.label} · 组件演示`} extra={<span className="demo-page__hint">local/test 专用</span>}>
                <div className="demo-config__content">
                    <Typography.Text type="tertiary">{group.note} 示例值只保留在当前页面；示例上传仍使用资源库，真实配置单独保存到 sys_config。</Typography.Text>
                    <label className="demo-config__readonly">
                        <Switch checked={readonly} onChange={setReadonly} aria-label="只读状态" />
                        <span>只读状态</span>
                    </label>
                    <h3>选项与状态</h3>
                    {group.key === 'special' ? variants.map((record, index) => <section key={record.id} className="demo-config__case">
                        <Typography.Text type="tertiary">{SPECIAL_NOTES[index]}</Typography.Text>
                        <SystemConfigGroupForm
                            key={`variant:${record.id}:${readonly}`}
                            records={[record]}
                            canEdit={!readonly}
                            showSettings={false}
                            onEdit={() => undefined}
                            onSave={saveVariants}
                        />
                    </section>) : <SystemConfigGroupForm
                        key={`variants:${group.key}:${readonly}`}
                        records={variants}
                        canEdit={!readonly}
                        showSettings={false}
                        onEdit={() => undefined}
                        onSave={saveVariants}
                    />}
                    {savedValues.length > 0 && <details>
                        <summary>查看本页保存的示例值</summary>
                        <pre>{JSON.stringify(savedValues, null, 2)}</pre>
                    </details>}
                    {group.fieldType && <>
                        <h3>真实配置</h3>
                        {query.isPending ? <Spin /> : query.isError ? (
                            <Typography.Text type="danger">配置读取失败；请确认账号具有系统配置查看权限。</Typography.Text>
                        ) : actualRecords.length === 0 ? (
                            <Typography.Text type="tertiary">当前类型没有已播种的真实配置项。</Typography.Text>
                        ) : <>
                            <SystemConfigGroupForm
                                key={`actual:${group.key}`}
                                records={actualRecords}
                                canEdit={canEdit}
                                showSettings={false}
                                onEdit={() => undefined}
                            />
                            <details>
                                <summary>查看 sys_config 已保存值</summary>
                                <pre>{JSON.stringify(actualRecords.map((record) => ({ key: record.configKey, value: record.configValue })), null, 2)}</pre>
                            </details>
                        </>}
                    </>}
                </div>
            </PageContainer>
        </div>
    );
}
