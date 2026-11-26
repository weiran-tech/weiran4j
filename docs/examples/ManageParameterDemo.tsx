import React, { useState } from 'react';
import { FileTypeIcon, FileUpload, IconPicker, ImageUpload, NavListItem, NavListPanel, OptionSelect, PdfPreview, RichTextEditor, TextAvatar, VideoPreview, DEFAULT_UPLOAD_SETTINGS, type OptionSelectOption, type TextAvatarProps, type UploadSettings } from '@weiran-tech/manage';
import { Heart, House, Settings } from 'lucide-react';
import { NavLogo } from '../../packages/manage/src/components/NavLogo';
import { DemoParameters, type DemoArgs, type DemoSchema } from './DemoParameters';
import type { ItemKey } from './ComponentGalleryReact';
const settings = { ...DEFAULT_UPLOAD_SETTINGS };
const schemas: Record<ItemKey, DemoSchema> = {
    'nav-logo': { defaults: { title: '自定义后台', size: 32, textIcon: '微', showLogo: true, showTitle: true, disabled: false } },
    image: { defaults: { value: '', formats: ['png', 'jpg'], maxSizeMb: 10, disabled: false } },
    file: { defaults: { value: [], multiple: true, maxFiles: 3, settings, disabled: false } },
    editor: { defaults: { value: '<p>编辑这段自定义内容</p>', settings, disabled: false } },
    video: { defaults: { url: '', title: '自定义视频预览', visible: false } },
    pdf: { defaults: { url: '', title: '自定义 PDF 预览', visible: false } },
    filetype: { defaults: { name: 'report.pdf', size: 56 } },
    avatar: { defaults: { text: '自', background: '#0064fa', fallback: '管理员', size: 'large' }, choices: { size: ['extra-extra-small', 'extra-small', 'small', 'default', 'medium', 'large', 'extra-large'] } },
    icon: { defaults: { value: 'House', icons: ['House', 'Heart', 'Settings'], disabled: false }, choices: { value: ['House', 'Heart', 'Settings'] } },
    option: { defaults: { value: 'enabled', placeholder: '请选择状态', options: [{ label: '启用', value: 'enabled', disabled: false }, { label: '停用', value: 'disabled', disabled: false }], disabled: false, loading: false, showClear: true } },
    navigation: { defaults: { title: '自定义导航', emptyText: '暂无条目', loading: false, dataSource: [{ key: 'first', name: '第一项' }, { key: 'second', name: '第二项' }] } },
    'nav-item': { defaults: { primary: '自定义条目', secondary: '副标题', meta: '补充信息', active: true } },
};
const presets: Record<ItemKey, NonNullable<DemoSchema['presets']>> = {
    'nav-logo': [{ label: '折叠导航', values: { showTitle: false, size: 26 } }, { label: '仅标题', values: { showLogo: false, title: '应用导航' } }, { label: '禁用入口', values: { disabled: true } }],
    image: [{ label: '仅 PNG · 2 MB', values: { formats: ['png'], maxSizeMb: 2 } }, { label: '禁用上传', values: { disabled: true } }],
    file: [{ label: '单文件上传', values: { multiple: false, maxFiles: 1 } }, { label: '多文件 · 最多 5 个', values: { multiple: true, maxFiles: 5 } }, { label: '禁用上传', values: { disabled: true } }],
    editor: [{ label: '空内容', values: { value: '' } }, { label: '只读内容', values: { value: '<h2>只读示例</h2><p>展示已有内容</p>', disabled: true } }],
    video: [{ label: '自定义标题', values: { title: '培训视频', visible: false } }, { label: '打开预览（请填写 URL）', values: { visible: true } }],
    pdf: [{ label: '自定义标题', values: { title: '合同文档', visible: false } }, { label: '打开预览（请填写 URL）', values: { visible: true } }],
    filetype: [{ label: '图片 · 小尺寸', values: { name: 'photo.png', size: 32 } }, { label: 'Excel 表格', values: { name: 'report.xlsx', size: 56 } }, { label: '压缩包', values: { name: 'archive.zip', size: 48 } }],
    avatar: [{ label: '小尺寸头像', values: { text: '微', size: 'extra-small' } }, { label: '绿色大头像', values: { text: '王', background: '#16803c', size: 'extra-large' } }],
    icon: [{ label: '收藏图标', values: { value: 'Heart' } }, { label: '精简候选项', values: { value: 'Settings', icons: ['House', 'Settings'] } }, { label: '禁用选择', values: { disabled: true } }],
    option: [{ label: '未选择 · 可清空', values: { value: '', showClear: true } }, { label: '禁用选择', values: { disabled: true } }, { label: '加载中', values: { loading: true, options: [] } }, { label: '空选项', values: { value: '', options: [] } }],
    navigation: [{ label: '空列表', values: { dataSource: [], emptyText: '尚未添加导航' } }, { label: '加载中', values: { loading: true, dataSource: [] } }],
    'nav-item': [{ label: '普通条目', values: { active: false, secondary: '', meta: '' } }, { label: '选中并显示说明', values: { active: true, primary: '系统设置', secondary: '管理应用配置', meta: '12 项' } }],
};
for (const key of Object.keys(schemas) as ItemKey[]) schemas[key].presets = presets[key];
const icons = { House, Heart, Settings };
function Preview({ selected, args, upload }: { selected: ItemKey; args: DemoArgs; upload: (file: File, progress: (value: number) => void) => Promise<string> }) {
    const [value, setValue] = useState(args.value as string ?? '');
    const [files, setFiles] = useState<string[]>(Array.isArray(args.value) ? args.value.filter((item): item is string => typeof item === 'string' && Boolean(item)) : []);
    const [active, setActive] = useState('');
    const [visible, setVisible] = useState(Boolean(args.visible));
    const [message, setMessage] = useState('');
    const disabled = Boolean(args.disabled);
    let component: React.ReactNode;
    switch (selected) {
        case 'nav-logo': component = <NavLogo title={args.title as string} size={args.size as number} textIcon={args.textIcon as string} showLogo={Boolean(args.showLogo)} showTitle={Boolean(args.showTitle)} disabled={disabled} onClick={() => setMessage('已点击导航品牌')} />; break;
        case 'image': component = <ImageUpload value={value} onChange={setValue} formats={args.formats as string[]} maxSizeMb={args.maxSizeMb as number} disabled={disabled} upload={upload} onError={setMessage} />; break;
        case 'file': component = args.multiple ? <FileUpload multiple value={files} onChange={setFiles} settings={args.settings as unknown as UploadSettings} maxFiles={args.maxFiles as number} disabled={disabled} upload={upload} /> : <FileUpload value={files[0] ?? ''} onChange={url => setFiles(url ? [url] : [])} settings={args.settings as unknown as UploadSettings} disabled={disabled} upload={upload} />; break;
        case 'editor': component = <RichTextEditor value={value} onChange={setValue} settings={args.settings as unknown as UploadSettings} disabled={disabled} upload={upload} />; break;
        case 'video': case 'pdf': component = <><button type="button" onClick={() => setVisible(true)}>打开自定义预览</button>{selected === 'video' ? <VideoPreview url={visible ? args.url as string : null} title={args.title as string} onClose={() => setVisible(false)} /> : <PdfPreview url={visible ? args.url as string : null} title={args.title as string} onClose={() => setVisible(false)} />}</>; break;
        case 'filetype': component = <FileTypeIcon name={args.name as string} size={args.size as number} />; break;
        case 'avatar': component = <TextAvatar avatar={{ text: args.text as string, background: args.background as string }} fallback={args.fallback as string} size={args.size as NonNullable<TextAvatarProps['size']>} />; break;
        case 'icon': component = <IconPicker value={value} onChange={setValue} icons={(args.icons as string[]).filter(name => name in icons)} disabled={disabled} renderIcon={(name, size) => { const Icon = icons[name as keyof typeof icons]; return <Icon size={size} />; }} />; break;
        case 'option': component = <OptionSelect value={value || undefined} onChange={next => setValue(next ?? '')} options={args.options as unknown as OptionSelectOption[]} disabled={disabled} loading={Boolean(args.loading)} showClear={Boolean(args.showClear)} placeholder={args.placeholder as string} />; break;
        case 'navigation': component = <div className="component-gallery__nav"><NavListPanel title={args.title as string} emptyText={args.emptyText as string} loading={Boolean(args.loading)} dataSource={args.dataSource as { key: string; name: string }[]} renderItem={item => <NavListItem key={item.key} primary={item.name} active={active === item.key} onClick={() => setActive(item.key)} />} /></div>; break;
        case 'nav-item': component = <div className="component-gallery__nav"><NavListPanel dataSource={[args]} renderItem={() => <NavListItem primary={args.primary as string} secondary={args.secondary as string} meta={args.meta as string} active={Boolean(args.active)} onClick={() => setMessage('条目点击回调已触发')} />} /></div>; break;
    }
    return <div>{component}{message && <p aria-live="polite">{message}</p>}</div>;
}
export function ManageParameterDemo({ component, upload }: { component: ItemKey; upload: (file: File, progress: (value: number) => void) => Promise<string> }) {
    return <DemoParameters key={component} name={component} schema={schemas[component]}>{args => <Preview selected={component} args={args} upload={upload} />}</DemoParameters>;
}
