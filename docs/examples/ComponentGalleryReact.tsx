import { ManageParameterDemo } from './ManageParameterDemo';
import '@douyinfe/semi-ui/react19-adapter';
import '@weiran-tech/manage/style.css';
import React, { useEffect, useRef } from 'react';
import './component-gallery.css';

const ITEMS = [
    { key: 'nav-logo', label: 'NavLogo', note: '导航品牌入口' },
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
    const upload = useLocalUpload();
    const current = ITEMS.find(item => item.key === selected) ?? ITEMS[0];
    return <div className="component-gallery">
        <p>{current.note}。示例使用实际组件，可切换参数组合并继续编辑。{['image', 'file', 'editor'].includes(selected) && '上传仅生成浏览器临时 URL。'}</p>
        <ManageParameterDemo component={selected} upload={upload} />
    </div>;
}
