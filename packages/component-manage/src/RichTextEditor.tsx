import { Button, Input, Modal, Popover, Progress, Space, Toast } from '@douyinfe/semi-ui';
import { Node, isNodeSelection, mergeAttributes, type Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AlignLeft, AlignCenter, AlignRight, Bold, Heading2, ImagePlus, Italic, Link as LinkIcon, Unlink, FilePlus2, List, ListOrdered, Quote, Redo2, Undo2, Video } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DEFAULT_UPLOAD_SETTINGS, imageFileError, ordinaryFileError, videoFileError } from './FileUpload';
import type { UploadFile, UploadSettings } from './FileUpload';
import { mediaAttributes, mediaStyle, normalizeMediaAlign, normalizeMediaWidth, type MediaAlign } from './richTextMedia';
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

const MediaImage = Image.extend({
    addAttributes() { return { ...this.parent?.(), ...mediaAttributes }; },
    renderHTML({ node, HTMLAttributes }) {
        return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            style: mediaStyle(node.attrs.width, node.attrs.align),
        })];
    },
});

const VideoNode = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    addAttributes() { return { src: { default: null }, ...mediaAttributes }; },
    parseHTML() { return [{ tag: 'video[src]' }]; },
    renderHTML({ node, HTMLAttributes }) {
        return ['video', { ...HTMLAttributes, style: mediaStyle(node.attrs.width, node.attrs.align),
            controls: 'controls', preload: 'metadata' }];
    },
});

interface UploadPlaceholder { id: number; label: string; top: number; left: number; percent: number | null }
interface ImageResize { anchor: { position: number }; node: HTMLElement; pointerId: number; startX: number; startY: number; startWidth: number; aspect: number; maxWidth: number; horizontal: number; vertical: number; originalWidth: string; width: number }
interface SelectedMedia { position: number; type: 'image' | 'video'; width: string; align: MediaAlign }

function selectedMediaFrom(editor: Editor): SelectedMedia | null {
    const { selection } = editor.state;
    if (!isNodeSelection(selection)) return null;
    const type = selection.node.type.name;
    if (type !== 'image' && type !== 'video') return null;
    return {
        type,
        position: selection.from,
        width: normalizeMediaWidth(selection.node.attrs.width),
        align: normalizeMediaAlign(selection.node.attrs.align),
    };
}

/** 富文本统一入口；上传动作和限制由调用方提供。 */
export function RichTextEditor({ value, disabled = false, label = '富文本', onChange, settings: uploadSettings,
    upload, settingsError = false, onRetrySettings, onUploadImage, onUploadingChange }: RichTextEditorProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<ReturnType<typeof useEditor>>(null);
    const pending = useRef({ image: 0, video: 0, file: 0 });
    const nextPlaceholderId = useRef(0);
    const mounted = useRef(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [linkDraft, setLinkDraft] = useState<string | null>(null);
    const [linkError, setLinkError] = useState('');
    const linkSelection = useRef<{ from: number; to: number } | null>(null);
    const insertionPositions = useRef(new Set<{ position: number }>());
    const [placeholders, setPlaceholders] = useState<UploadPlaceholder[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
    const [widthDraft, setWidthDraft] = useState('100');
    const [mediaPopupOpen, setMediaPopupOpen] = useState(false);
    const [mediaAnchor, setMediaAnchor] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const imageResize = useRef<ImageResize | null>(null);
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

    const changePending = (kind: 'image' | 'video' | 'file', delta: 1 | -1) => {
        const previousTotal = pending.current.image + pending.current.video + pending.current.file;
        pending.current[kind] += delta;
        if (!mounted.current) return;
        if (kind === 'image') setUploadingImage(pending.current.image > 0);
        else if (kind === 'video') setUploadingVideo(pending.current.video > 0);
        if (kind === 'file') setUploadingFile(pending.current.file > 0);
        const nextTotal = pending.current.image + pending.current.video + pending.current.file;
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

    const insertFiles = async (files: File[]) => {
        const current = editorRef.current;
        const settings = uploadSettingsRef.current;
        if (!current?.isEditable || !settings || files.length === 0) return;
        const valid = files.filter((file) => {
            const error = ordinaryFileError(file, settings);
            if (error) Toast.error(error);
            return !error;
        });
        if (!valid.length) return;
        const anchor = { position: current.state.selection.from };
        insertionPositions.current.add(anchor);
        const id = addPlaceholder(current, anchor.position, `文件上传中（${valid.length} 个）…`);
        const progress = valid.map(() => 0);
        changePending('file', 1);
        try {
            const results = await Promise.allSettled(valid.map(async (file, index) => {
                const result = await upload(file, (percent) => updatePlaceholderProgress(id, valid, progress, index, percent));
                const url = typeof result === 'string' ? result : result.url;
                if (!url || !['http:', 'https:', 'blob:'].includes(new URL(url, window.location.origin).protocol)) throw new Error('文件地址无效');
                return { type: 'text', text: typeof result === 'string' ? file.name : result.name || file.name,
                    marks: [{ type: 'link', attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' } }] };
            }));
            if (!mounted.current) return;
            if (results.some((result) => result.status === 'rejected')) Toast.error('部分文件上传失败，请重新选择重试');
            const content = results.flatMap((result) => result.status === 'fulfilled'
                ? [result.value, { type: 'text', text: ' ' }] : []);
            if (!current.isDestroyed && current.isEditable && content.length) current.chain().focus().insertContentAt(anchor.position, content).run();
        } finally {
            insertionPositions.current.delete(anchor);
            removePlaceholder(id);
            changePending('file', -1);
        }
    };

    const openLink = () => {
        if (!editorRef.current?.isEditable) return;
        const current = editorRef.current;
        linkSelection.current = { from: current.state.selection.from, to: current.state.selection.to };
        setLinkDraft(current.getAttributes('link').href ?? '');
        setLinkError('');
    };

    const saveLink = () => {
        const current = editorRef.current;
        if (!current?.isEditable || linkDraft === null || !linkSelection.current) return;
        const href = linkDraft.trim();
        try {
            if (!href || !['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(href, window.location.origin).protocol)) throw new Error('invalid');
        } catch {
            setLinkError('请输入有效的 HTTP(S)、邮箱、电话或站内链接');
            return;
        }
        const { from, to } = linkSelection.current;
        const chain = current.chain().focus().setTextSelection({ from, to }).extendMarkRange('link');
        if (from === to && !current.isActive('link')) {
            chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
        } else chain.setLink({ href }).run();
        linkSelection.current = null;
        setLinkDraft(null);
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ link: { openOnClick: false, protocols: ['blob'],
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } } }),
            MediaImage.configure({ allowBase64: false }), VideoNode,
        ],
        content: value,
        editable: !disabled,
        immediatelyRender: false,
        onTransaction: ({ transaction }) => {
            for (const anchor of insertionPositions.current) anchor.position = transaction.mapping.map(anchor.position);
            if (linkSelection.current) {
                linkSelection.current.from = transaction.mapping.map(linkSelection.current.from);
                linkSelection.current.to = transaction.mapping.map(linkSelection.current.to);
            }
        },
        onUpdate: ({ editor: current }) => onChange(current.getHTML()),
        editorProps: {
            attributes: { 'aria-label': label },
            handleClickOn: (_view, _position, node, nodePosition, _event, direct) => {
                const current = editorRef.current;
                if (!direct || !current?.isEditable || !['image', 'video'].includes(node.type.name)) return false;
                current.commands.setNodeSelection(nodePosition);
                setMediaPopupOpen(true);
                return true;
            },
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

    const linkActive = useEditorState({ editor, selector: ({ editor: current }) => current?.isActive('link') ?? false });

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        if (!editor) return;
        editorRef.current = editor;
        if (editor.isEditable === disabled) editor.setEditable(!disabled);
        if (editor.getHTML() !== value) editor.commands.setContent(value || '', { emitUpdate: false });
    }, [disabled, editor, value]);

    useEffect(() => {
        if (!editor) return;
        const sync = () => setSelectedMedia((previous) => {
            const next = selectedMediaFrom(editor);
            return previous?.position === next?.position && previous?.type === next?.type && previous?.width === next?.width && previous?.align === next?.align
                ? previous : next;
        });
        editor.on('selectionUpdate', sync);
        editor.on('update', sync);
        sync();
        return () => { editor.off('selectionUpdate', sync); editor.off('update', sync); };
    }, [editor]);

    useEffect(() => {
        if (selectedMedia) setWidthDraft(selectedMedia.width.replace(/(%|px)$/, ''));
    }, [selectedMedia?.width, selectedMedia?.type]);

    useEffect(() => {
        setMediaPopupOpen(!!selectedMedia && !disabled);
    }, [selectedMedia?.position, selectedMedia?.type, disabled]);

    useEffect(() => {
        if (!editor || !selectedMedia || !contentRef.current) return;
        const content = contentRef.current;
        const updateAnchor = () => {
            const node = editor.view.nodeDOM(selectedMedia.position);
            if (!(node instanceof HTMLElement)) return;
            const rect = node.getBoundingClientRect();
            const parent = content.getBoundingClientRect();
            const next = { top: rect.top - parent.top, left: rect.left - parent.left, width: rect.width, height: rect.height };
            setMediaAnchor((previous) => previous.top === next.top && previous.left === next.left && previous.width === next.width && previous.height === next.height ? previous : next);
        };
        updateAnchor();
        const observer = new ResizeObserver(updateAnchor);
        observer.observe(content);
        const node = editor.view.nodeDOM(selectedMedia.position);
        if (node instanceof HTMLElement) observer.observe(node);
        content.addEventListener('load', updateAnchor, true);
        editor.on('transaction', updateAnchor);
        return () => {
            observer.disconnect();
            content.removeEventListener('load', updateAnchor, true);
            editor.off('transaction', updateAnchor);
        };
    }, [editor, selectedMedia]);

    const setMediaLayout = (attributes: { width?: string; align?: MediaAlign }) => {
        if (selectedMedia && !disabled) editor?.commands.updateAttributes(selectedMedia.type, attributes);
    };

    const cancelImageResize = () => {
        const current = imageResize.current;
        if (!current) return;
        current.node.style.width = current.originalWidth;
        insertionPositions.current.delete(current.anchor);
        imageResize.current = null;
    };

    useEffect(() => {
        if (disabled) cancelImageResize();
        return cancelImageResize;
    }, [disabled]);

    const startImageResize = (event: ReactPointerEvent<HTMLButtonElement>, horizontal: number, vertical: number) => {
        if (disabled || !editor || selectedMedia?.type !== 'image' || event.button !== 0) return;
        const node = editor.view.nodeDOM(selectedMedia.position);
        if (!(node instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const parent = node.parentElement!;
        const padding = getComputedStyle(parent);
        const anchor = { position: selectedMedia.position };
        insertionPositions.current.add(anchor);
        imageResize.current = { anchor, node, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
            startWidth: rect.width, aspect: rect.width / rect.height,
            maxWidth: Math.min(2000, parent.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight)),
            horizontal, vertical, originalWidth: node.style.width, width: rect.width };
        event.currentTarget.setPointerCapture(event.pointerId);
        setMediaPopupOpen(false);
    };

    const moveImageResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = imageResize.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = (event.clientX - current.startX) * current.horizontal;
        const dy = (event.clientY - current.startY) * current.vertical * current.aspect;
        const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
        current.width = Math.round(Math.max(Math.min(32, current.maxWidth), Math.min(current.maxWidth, current.startWidth + delta)));
        current.node.style.width = `${current.width}px`;
    };

    const finishImageResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = imageResize.current;
        if (!current || current.pointerId !== event.pointerId) return;
        moveImageResize(event);
        const { position } = current.anchor;
        const width = current.width;
        const connected = current.node.isConnected;
        cancelImageResize();
        if (Math.abs(width - current.startWidth) >= 1 && connected && editor?.isEditable && editor.state.doc.nodeAt(position)?.type.name === 'image') {
            editor.chain().setNodeSelection(position).updateAttributes('image', { width: `${width}px` }).run();
            setMediaPopupOpen(true);
        }
    };

    const commitWidth = (unit: '%' | 'px') => {
        if (!selectedMedia) return;
        const amount = Number(widthDraft);
        if (!Number.isFinite(amount) || amount < 1) {
            setWidthDraft(selectedMedia.width.replace(/(%|px)$/, ''));
            return;
        }
        const normalized = Math.min(Math.round(amount), unit === '%' ? 100 : 2000);
        setWidthDraft(String(normalized));
        setMediaLayout({ width: `${normalized}${unit}` });
    };

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
                <Button size="small" theme="borderless" icon={<FilePlus2 size={14} />} disabled={disabled || uploadingFile || !uploadSettings} aria-label="上传并插入文件" title="上传并插入文件" onClick={() => fileInputRef.current?.click()} />
                <input ref={fileInputRef} hidden type="file" accept={settings.fileFormats.map((format) => `.${format}`).join(',')} multiple onChange={(event) => { void insertFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
                <Button size="small" theme="borderless" icon={<LinkIcon size={14} />} disabled={disabled} aria-label="设置链接" title="设置链接" onClick={openLink} />
                <Button size="small" theme="borderless" icon={<Unlink size={14} />} disabled={disabled || !linkActive} aria-label="移除链接" title="移除链接" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()} />
                {settingsError && onRetrySettings && <Button size="small" onClick={onRetrySettings}>重试加载上传配置</Button>}
                </Space>

            </div>
            <Modal title="设置链接" visible={linkDraft !== null} onCancel={() => { linkSelection.current = null; setLinkDraft(null); }} onOk={saveLink}
                okText="保存" cancelText="取消" okButtonProps={{ disabled, 'aria-label': '保存链接' }} cancelButtonProps={{ 'aria-label': '取消链接编辑' }}>
                <label htmlFor={`${editor.instanceId}-link`}>链接地址</label>
                <Input id={`${editor.instanceId}-link`} aria-label="链接地址" value={linkDraft ?? ''} disabled={disabled}
                    onChange={(value) => { setLinkDraft(value); setLinkError(''); }} onEnterPress={saveLink}
                    aria-invalid={!!linkError} aria-describedby={linkError ? `${editor.instanceId}-link-error` : undefined} />
                {linkError && <p id={`${editor.instanceId}-link-error`} className="rich-text-editor__link-error" role="alert">{linkError}</p>}
            </Modal>
            <div ref={contentRef} className="rich-text-editor__content" onMouseDownCapture={(event) => {
                if (!disabled && event.target instanceof HTMLElement && event.target.matches('img, video')) {
                    event.preventDefault();
                    editor.commands.setNodeSelection(editor.view.posAtDOM(event.target, 0));
                    setMediaPopupOpen(true);
                }
            }} onClick={(event) => {
                if (!disabled && event.target instanceof HTMLElement && event.target.matches('img, video')) {
                    editor.commands.setNodeSelection(editor.view.posAtDOM(event.target, 0));
                    setMediaPopupOpen(true);
                }
            }}>
                <EditorContent editor={editor} />
                {selectedMedia && !disabled && <Popover trigger="custom" visible={mediaPopupOpen} position="topLeft" motion={false}
                    style={{ boxShadow: 'none', borderRadius: 6 }} contentClassName="rich-text-editor__media-popup" guardFocus={false} returnFocusOnClose={false} disableFocusListener closeOnEsc onEscKeyDown={() => setMediaPopupOpen(false)}
                    onClickOutSide={(event) => {
                        if (event.target !== editor.view.nodeDOM(selectedMedia.position)) setMediaPopupOpen(false);
                    }}
                    rePosKey={`${mediaAnchor.top}:${mediaAnchor.left}:${selectedMedia.width}:${selectedMedia.align}`}
                    content={<div className="rich-text-editor__media-tools" role="group" aria-label={`${selectedMedia.type === 'image' ? '图片' : '视频'}布局`}>
                    <span>{selectedMedia.type === 'image' ? '图片' : '视频'}宽度</span>
                    <input type="number" min={1} max={selectedMedia.width.endsWith('%') ? 100 : 2000}
                        aria-label="媒体宽度" value={widthDraft} disabled={disabled}
                        onChange={(event) => setWidthDraft(event.currentTarget.value)}
                        onBlur={() => commitWidth(selectedMedia.width.endsWith('%') ? '%' : 'px')}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                    <select aria-label="宽度单位" value={selectedMedia.width.endsWith('%') ? '%' : 'px'} disabled={disabled}
                        onChange={(event) => commitWidth(event.currentTarget.value as '%' | 'px')}>
                        <option value="%">%</option>
                        <option value="px">px</option>
                    </select>
                    <div className="rich-text-editor__alignment" role="group" aria-label="媒体位置">
                        {([{ align: 'left', label: '左对齐', Icon: AlignLeft }, { align: 'center', label: '居中', Icon: AlignCenter },
                            { align: 'right', label: '右对齐', Icon: AlignRight }] as const).map(({ align, label: alignmentLabel, Icon }) => <Button
                                key={align} size="small" icon={<Icon size={16} />} aria-label={alignmentLabel} title={alignmentLabel}
                                aria-pressed={selectedMedia.align === align} theme={selectedMedia.align === align ? 'solid' : 'borderless'}
                                onClick={() => setMediaLayout({ align })} />)}
                    </div>
                </div>}>
                    <span className="rich-text-editor__media-anchor" aria-hidden="true" style={{ top: mediaAnchor.top, left: mediaAnchor.left }} />
                </Popover>}
                {selectedMedia?.type === 'image' && !disabled && <div className="rich-text-editor__image-resize" style={mediaAnchor}>
                    {([{ corner: 'nw', horizontal: -1, vertical: -1 }, { corner: 'ne', horizontal: 1, vertical: -1 },
                        { corner: 'sw', horizontal: -1, vertical: 1 }, { corner: 'se', horizontal: 1, vertical: 1 }] as const).map(({ corner, horizontal, vertical }) => <button
                            key={corner} type="button" className={`rich-text-editor__resize-handle rich-text-editor__resize-handle--${corner}`}
                            aria-label={`拖动调整图片大小 ${corner}`} title="拖动调整图片大小"
                            onPointerDown={(event) => startImageResize(event, horizontal, vertical)} onPointerMove={moveImageResize}
                            onPointerUp={finishImageResize} onPointerCancel={cancelImageResize} onLostPointerCapture={cancelImageResize}
                            onClick={(event) => event.stopPropagation()} />)}
                </div>}
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
