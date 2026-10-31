import '@douyinfe/semi-ui/react19-adapter';
import '@weiran-tech/backend-components/style.css';
import {
    FileTypeIcon, FileUpload, IconPicker, ImageUpload, NavListItem, NavListPanel,
    OptionSelect, PdfPreview, RichTextEditor, TextAvatar, VideoPreview,
    DEFAULT_UPLOAD_SETTINGS,
} from '@weiran-tech/backend-components';
import { Heart, House, Settings } from 'lucide-react';
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import './component-gallery.css';

const ITEMS = [
    { key: 'image', label: 'ImageUpload', note: '单图上传' },
    { key: 'file', label: 'FileUpload', note: '单文件、多文件' },
    { key: 'editor', label: 'RichTextEditor', note: '富文本与媒体' },
    { key: 'video', label: 'VideoPreview', note: '视频弹窗' },
    { key: 'pdf', label: 'PdfPreview', note: 'PDF 弹窗' },
    { key: 'filetype', label: 'FileTypeIcon', note: '文件类型' },
    { key: 'avatar', label: 'TextAvatar', note: '文字头像' },
    { key: 'icon', label: 'IconPicker', note: '图标选择' },
    { key: 'option', label: 'OptionSelect', note: '选项选择' },
    { key: 'navigation', label: 'NavListPanel', note: '导航列表' },
    { key: 'nav-item', label: 'NavListItem', note: '导航条目' },
] as const;

export type ItemKey = typeof ITEMS[number]['key'];
type ExampleProps = { title: string; children: ReactNode };

function Example({ title, children }: ExampleProps) {
    return <section className="component-gallery__example"><h4>{title}</h4>{children}</section>;
}

const ICONS = { House, Heart, Settings };
const ICON_NAMES = Object.keys(ICONS);

/** 文档示例只在浏览器里生成临时 URL，不调用业务接口。 */
function useLocalUpload() {
    const urls = useRef<string[]>([]);
    useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
    return async (file: File, onProgress: (percent: number) => void) => {
        onProgress(30);
        await new Promise((resolve) => setTimeout(resolve, 350));
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        onProgress(100);
        return url;
    };
}

export function ComponentGallery({ component: selected }: { component: ItemKey }) {
    const [image, setImage] = useState('');
    const [file, setFile] = useState('');
    const [files, setFiles] = useState<string[]>([]);
    const [html, setHtml] = useState('<p>选中图片或视频后，可设置宽度和位置。</p>');
    const [mediaUrl, setMediaUrl] = useState('');
    const [preview, setPreview] = useState<'video' | 'pdf' | null>(null);
    const [icon, setIcon] = useState('House');
    const [option, setOption] = useState<string | undefined>();
    const [navItem, setNavItem] = useState('first');
    const [error, setError] = useState('');
    const upload = useLocalUpload();
    const current = ITEMS.find((item) => item.key === selected) ?? ITEMS[0];
    const showError = (message: string) => setError(message);

    const examples = () => {
        switch (selected) {
            case 'image':
                return <>
                    <Example title="默认 / 上传后预览"><ImageUpload value={image} onChange={setImage}
                        formats={DEFAULT_UPLOAD_SETTINGS.imageFormats} maxSizeMb={DEFAULT_UPLOAD_SETTINGS.imageMaxSizeMb}
                        upload={upload} onError={showError} /></Example>
                    <Example title="禁用"><ImageUpload value={image} onChange={() => undefined} disabled
                        formats={DEFAULT_UPLOAD_SETTINGS.imageFormats} maxSizeMb={DEFAULT_UPLOAD_SETTINGS.imageMaxSizeMb}
                        upload={upload} /></Example>
                </>;
            case 'file':
                return <>
                    <Example title="单文件"><FileUpload value={file} onChange={setFile} settings={DEFAULT_UPLOAD_SETTINGS}
                        upload={upload} onUploadError={() => showError('上传失败，请重试')} /></Example>
                    <Example title="多文件 / 排序"><FileUpload multiple value={files} onChange={setFiles}
                        settings={DEFAULT_UPLOAD_SETTINGS} upload={upload} onUploadError={() => showError('上传失败，请重试')} /></Example>
                    <Example title="禁用"><FileUpload value={file} onChange={() => undefined} settings={DEFAULT_UPLOAD_SETTINGS}
                        upload={upload} disabled /></Example>
                </>;
            case 'editor':
                return <>
                    <Example title="可编辑 / 图片和视频宽度与位置"><RichTextEditor value={html} onChange={setHtml}
                        settings={DEFAULT_UPLOAD_SETTINGS} upload={upload} /></Example>
                    <Example title="只读"><RichTextEditor value={html} onChange={() => undefined} disabled
                        settings={DEFAULT_UPLOAD_SETTINGS} upload={upload} /></Example>
                    <details><summary>查看当前 HTML</summary><pre>{html}</pre></details>
                </>;
            case 'video':
            case 'pdf':
                return <Example title="打开与关闭弹窗">
                    <p>输入可访问的 {selected === 'video' ? '视频' : 'PDF'} URL 后预览。</p>
                    <input className="component-gallery__url" type="url" aria-label="媒体 URL" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)}
                        placeholder="https://example.com/sample.pdf" />
                    <button type="button" disabled={!mediaUrl.trim()} onClick={() => setPreview(selected)}>打开预览</button>
                    <VideoPreview url={preview === 'video' ? mediaUrl : null} title="视频预览" onClose={() => setPreview(null)} />
                    <PdfPreview url={preview === 'pdf' ? mediaUrl : null} title="PDF 预览" onClose={() => setPreview(null)} />
                </Example>;
            case 'filetype':
                return <Example title="常见扩展名"><div className="component-gallery__tiles">
                    {['photo.png', 'movie.mp4', 'document.pdf', 'report.docx', 'slides.pptx', 'sheet.xlsx', 'archive.zip'].map((name) =>
                        <div key={name}><FileTypeIcon name={name} size={56} /><span>{name}</span></div>)}
                </div></Example>;
            case 'avatar':
                return <Example title="自定义 / 回退文字 / 小尺寸"><div className="component-gallery__tiles">
                    <div><TextAvatar avatar={{ text: '微', background: '#0064FA' }} fallback="微然" size="large" /><span>自定义</span></div>
                    <div><TextAvatar avatar={null} fallback="管理员" size="large" /><span>回退文字</span></div>
                    <div><TextAvatar avatar={{ text: '小' }} fallback="小王" size="extra-small" /><span>小尺寸</span></div>
                </div></Example>;
            case 'icon':
                return <>
                    <Example title="可选择 / 清空"><IconPicker value={icon} onChange={setIcon} icons={ICON_NAMES}
                        renderIcon={(name, size) => { const Icon = ICONS[name as keyof typeof ICONS]; return <Icon size={size} />; }} /></Example>
                    <Example title="禁用"><IconPicker value="Heart" icons={ICON_NAMES} disabled
                        renderIcon={(name, size) => { const Icon = ICONS[name as keyof typeof ICONS]; return <Icon size={size} />; }} /></Example>
                </>;
            case 'option':
                return <>
                    <Example title="可选择 / 清空"><OptionSelect value={option} onChange={setOption} options={[
                        { label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' },
                    ]} /><span>当前值：{option ?? '未选择'}</span></Example>
                    <Example title="禁用"><OptionSelect value="enabled" disabled options={[{ label: '启用', value: 'enabled' }]} /></Example>
                    <Example title="加载中"><OptionSelect options={[]} loading /></Example>
                </>;
            case 'navigation':
                return <>
                    <Example title="有数据 / 选中项"><div className="component-gallery__nav"><NavListPanel title="示例导航"
                        dataSource={[{ key: 'first', name: '第一项' }, { key: 'second', name: '第二项' }]}
                        renderItem={(item) => <NavListItem key={item.key} primary={item.name} secondary={item.key}
                            active={navItem === item.key} onClick={() => setNavItem(item.key)} />} /></div></Example>
                    <Example title="空数据"><div className="component-gallery__nav"><NavListPanel title="空列表"
                        dataSource={[]} emptyText="暂无条目" renderItem={() => null} /></div></Example>
                </>;
            case 'nav-item':
                return <Example title="普通 / 选中 / 带副标题">
                    <div className="component-gallery__nav"><NavListPanel dataSource={[
                        { key: 'first', name: '普通条目' }, { key: 'second', name: '选中条目' },
                    ]} renderItem={(item) => <NavListItem key={item.key} primary={item.name} secondary={item.key}
                        active={navItem === item.key} onClick={() => setNavItem(item.key)} />} /></div>
                </Example>;
        }
    };

    return <div className="component-gallery">
        <div className="component-gallery__content">
            <p>{current.note}。示例直接使用组件包的公开导出。
                {['image', 'file', 'editor'].includes(selected) && ' 上传仅生成浏览器临时 URL。'}</p>
            {error && <p role="alert" className="component-gallery__error">{error}</p>}
            {examples()}
        </div>
    </div>;
}
