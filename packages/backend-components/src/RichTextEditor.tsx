import { Button, Progress, Space, Toast } from '@douyinfe/semi-ui';
import { Node } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, ImagePlus, Italic, List, ListOrdered, Quote, Redo2, Undo2, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_UPLOAD_SETTINGS, imageFileError, videoFileError } from './FileUpload';
import type { UploadFile, UploadSettings } from './FileUpload';
import './RichTextEditor.css';

export interface RichTextEditorProps {
    value: string;
    disabled?: boolean | undefined;
    label?: string | undefined;
    onChange: (html: string) => void;
    settings?: UploadSettings | undefined;
    upload: UploadFile;
    settingsError?: boolean | undefined;
    onRetrySettings?: (() => void) | undefined;
    onUploadImage?: ((file: File, onProgress?: (percent: number) => void) => Promise<string | { url: string; name?: string }>) | undefined;
    onUploadingChange?: ((uploading: boolean) => void) | undefined;
}

const VideoNode = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    addAttributes() { return { src: { default: null } }; },
    parseHTML() { return [{ tag: 'video[src]' }]; },
    renderHTML({ HTMLAttributes }) { return ['video', { ...HTMLAttributes, controls: 'controls', preload: 'metadata' }]; },
});

interface UploadPlaceholder { id: number; label: string; top: number; left: number; percent: number | null }

/** 富文本统一入口；上传动作和限制由调用方提供。 */
export function RichTextEditor({ value, disabled = false, label = '富文本', onChange, settings: uploadSettings,
    upload, settingsError = false, onRetrySettings, onUploadImage, onUploadingChange }: RichTextEditorProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<ReturnType<typeof useEditor>>(null);
    const pending = useRef({ image: 0, video: 0 });
    const nextPlaceholderId = useRef(0);
    const mounted = useRef(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [placeholders, setPlaceholders] = useState<UploadPlaceholder[]>([]);
    const settings = uploadSettings ?? DEFAULT_UPLOAD_SETTINGS;
    const uploadSettingsRef = useRef(uploadSettings);

    useEffect(() => {
        uploadSettingsRef.current = uploadSettings;
    }, [uploadSettings]);

    const addPlaceholder = (editor: NonNullable<ReturnType<typeof useEditor>>, position: number, label: string, tracked = true) => {
        const id = ++nextPlaceholderId.current;
        const caret = editor.view.coordsAtPos(position);
        const content = contentRef.current?.getBoundingClientRect();
        setPlaceholders((previous) => [...previous, {
            id, label, percent: tracked ? 0 : null,
            top: content ? Math.max(0, caret.top - content.top) : 0,
            left: content ? Math.max(0, caret.left - content.left) : 0,
        }]);
        return id;
    };

    const removePlaceholder = (id: number) => {
        if (mounted.current) setPlaceholders((previous) => previous.filter((placeholder) => placeholder.id !== id));
    };

    const updatePlaceholderProgress = (id: number, files: File[], progress: number[], index: number, percent: number) => {
        progress[index] = percent;
        const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
        const overall = totalBytes > 0
            ? Math.round(files.reduce((sum, file, item) => sum + file.size * (progress[item] ?? 0), 0) / totalBytes)
            : 0;
        if (mounted.current) setPlaceholders((previous) => previous.map((placeholder) => placeholder.id === id ? { ...placeholder, percent: overall } : placeholder));
    };

    const changePending = (kind: 'image' | 'video', delta: 1 | -1) => {
        const previousTotal = pending.current.image + pending.current.video;
        pending.current[kind] += delta;
        if (!mounted.current) return;
        if (kind === 'image') setUploadingImage(pending.current.image > 0);
        else setUploadingVideo(pending.current.video > 0);
        const nextTotal = pending.current.image + pending.current.video;
        if (previousTotal === 0 && nextTotal > 0) onUploadingChange?.(true);
        if (previousTotal > 0 && nextTotal === 0) onUploadingChange?.(false);
    };

    const insertImages = async (files: File[]) => {
        const currentEditor = editorRef.current;
        if (!currentEditor?.isEditable || files.length === 0) return;
        const uploadSettings = uploadSettingsRef.current;
        if (!uploadSettings) {
            Toast.error('上传配置尚未加载，请稍后重试');
            return;
        }
        const valid = files.filter((file) => {
            const error = imageFileError(file, uploadSettings);
            if (error) Toast.error(error);
            return !error;
        });
        if (valid.length === 0) return;
        const position = currentEditor.state.selection.from;
        const placeholderId = addPlaceholder(currentEditor, position, `图片上传中（${valid.length} 张）…`, !onUploadImage);
        const progress = valid.map(() => 0);
        changePending('image', 1);
        try {
            const results = await Promise.allSettled(valid.map(async (file, index) => {
                const reportProgress = (percent: number) => {
                    updatePlaceholderProgress(placeholderId, valid, progress, index, percent);
                };
                const result = onUploadImage ? await onUploadImage(file, reportProgress) : await upload(file, reportProgress);
                const url = typeof result === 'string' ? result : result.url;
                if (!url) throw new Error('上传未返回图片地址');
                return { url, name: typeof result === 'string' ? file.name : result.name ?? file.name };
            }));
            const images = results.flatMap((result) => result.status === 'fulfilled'
                ? [{ type: 'image', attrs: { src: result.value.url, alt: result.value.name } }]
                : []);
            if (results.some((result) => result.status === 'rejected') && onUploadImage) Toast.error('部分图片上传失败，请重试');
            if (mounted.current && currentEditor.isEditable && images.length > 0) {
                currentEditor.chain().focus().insertContentAt(position, images).run();
            }
        } finally {
            removePlaceholder(placeholderId);
            changePending('image', -1);
        }
    };

    const insertVideos = async (files: File[]) => {
        const currentEditor = editorRef.current;
        if (!currentEditor?.isEditable || files.length === 0) return;
        const uploadSettings = uploadSettingsRef.current;
        if (!uploadSettings) {
            Toast.error('上传配置尚未加载，请稍后重试');
            return;
        }
        const valid = files.filter((file) => {
            const error = videoFileError(file, uploadSettings);
            if (error) Toast.error(error);
            return !error;
        });
        if (valid.length === 0) return;
        const position = currentEditor.state.selection.from;
        const placeholderId = addPlaceholder(currentEditor, position, `视频上传中（${valid.length} 个）…`);
        const progress = valid.map(() => 0);
        changePending('video', 1);
        try {
            const results = await Promise.allSettled(valid.map((file, index) => upload(file, (percent) => {
                updatePlaceholderProgress(placeholderId, valid, progress, index, percent);
            })));
            const videos = results.flatMap((result) => result.status === 'fulfilled'
                ? [{ type: 'video', attrs: { src: typeof result.value === 'string' ? result.value : result.value.url } }]
                : []);
            if (mounted.current && currentEditor.isEditable && videos.length > 0) {
                currentEditor.chain().focus().insertContentAt(position, videos).run();
            }
        } finally {
            removePlaceholder(placeholderId);
            changePending('video', -1);
        }
    };

    const editor = useEditor({
        extensions: [StarterKit, Image.configure({ allowBase64: false }), VideoNode],
        content: value,
        editable: !disabled,
        immediatelyRender: false,
        onUpdate: ({ editor: current }) => onChange(current.getHTML()),
        editorProps: {
            attributes: { 'aria-label': label },
            handlePaste: (_view, event) => {
                const files = Array.from(event.clipboardData?.items ?? [])
                    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
                    .map((item) => item.getAsFile())
                    .filter((file): file is File => file !== null);
                if (files.length === 0 || !editorRef.current?.isEditable) return false;
                event.preventDefault();
                void insertImages(files);
                return true;
            },
        },
    });

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        if (!editor) return;
        editorRef.current = editor;
        editor.setEditable(!disabled);
        if (editor.getHTML() !== value) editor.commands.setContent(value || '', { emitUpdate: false });
    }, [disabled, editor, value]);

    if (!editor) return null;

    return (
        <div className="rich-text-editor">
            <div className="rich-text-editor__toolbar" role="toolbar" aria-label={`${label}格式工具`}>
                <Space spacing={4} wrap>
                <Button size="small" theme={editor.isActive('bold') ? 'solid' : 'borderless'} icon={<Bold size={14} />} disabled={disabled} aria-label="粗体" onClick={() => editor.chain().focus().toggleBold().run()} />
                <Button size="small" theme={editor.isActive('italic') ? 'solid' : 'borderless'} icon={<Italic size={14} />} disabled={disabled} aria-label="斜体" onClick={() => editor.chain().focus().toggleItalic().run()} />
                <Button size="small" theme={editor.isActive('heading', { level: 2 }) ? 'solid' : 'borderless'} icon={<Heading2 size={14} />} disabled={disabled} aria-label="二级标题" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
                <Button size="small" theme={editor.isActive('bulletList') ? 'solid' : 'borderless'} icon={<List size={14} />} disabled={disabled} aria-label="无序列表" onClick={() => editor.chain().focus().toggleBulletList().run()} />
                <Button size="small" theme={editor.isActive('orderedList') ? 'solid' : 'borderless'} icon={<ListOrdered size={14} />} disabled={disabled} aria-label="有序列表" onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                <Button size="small" theme={editor.isActive('blockquote') ? 'solid' : 'borderless'} icon={<Quote size={14} />} disabled={disabled} aria-label="引用" onClick={() => editor.chain().focus().toggleBlockquote().run()} />
                <Button size="small" theme="borderless" icon={<Undo2 size={14} />} disabled={disabled || !editor.can().undo()} aria-label="撤销" onClick={() => editor.chain().focus().undo().run()} />
                <Button size="small" theme="borderless" icon={<Redo2 size={14} />} disabled={disabled || !editor.can().redo()} aria-label="重做" onClick={() => editor.chain().focus().redo().run()} />
                <Button size="small" theme="borderless" icon={<ImagePlus size={14} />} disabled={disabled || uploadingImage || !uploadSettings} aria-label="上传并插入图片" onClick={() => inputRef.current?.click()} />
                <input ref={inputRef} hidden type="file" accept={settings.imageFormats.map((format) => `.${format}`).join(',')} multiple onChange={(event) => { void insertImages(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
                <Button size="small" theme="borderless" icon={<Video size={14} />} disabled={disabled || uploadingVideo || !uploadSettings} aria-label="上传并插入视频" onClick={() => videoInputRef.current?.click()} />
                <input ref={videoInputRef} hidden type="file" accept={settings.videoFormats.map((format) => `.${format}`).join(',')} multiple onChange={(event) => { void insertVideos(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
                {settingsError && onRetrySettings && <Button size="small" onClick={onRetrySettings}>重试加载上传配置</Button>}
                </Space>
            </div>
            <div ref={contentRef} className="rich-text-editor__content">
                <EditorContent editor={editor} />
                {placeholders.map((placeholder) => (
                    <span key={placeholder.id} className="rich-text-editor__upload-placeholder" role="status" style={{ top: placeholder.top, left: placeholder.left }}>
                        <span>{placeholder.label}{placeholder.percent === null ? '' : ` ${placeholder.percent}%${placeholder.percent === 100 ? ' · 等待确认' : ''}`}</span>
                        {placeholder.percent !== null && <Progress percent={placeholder.percent} size="small" />}
                    </span>
                ))}
            </div>
        </div>
    );
}
