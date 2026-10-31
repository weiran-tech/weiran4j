import { Button, ImagePreview, Progress, Toast } from '@douyinfe/semi-ui';
import { ArrowLeft, ArrowRight, Download, Eye, FilePlus2, Play, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useUploadSettings, useUploadSystemFile } from '@/hooks/queries/system-media';
import type { SystemMediaUploadSettings } from '@/types/api';
import { openFileUrl } from '@/lib/file-url';
import { FileTypeIcon, fileExtension, isImageFile, isPdfFile, isVideoFile } from './FileTypeIcon';
import { PdfPreview } from './PdfPreview';
import { VideoPreview } from './VideoPreview';
import './FileUpload.css';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
export const DEFAULT_UPLOAD_SETTINGS: SystemMediaUploadSettings = {
    imageFormats: ['gif', 'jpg', 'jpeg', 'png'], imageMaxSizeMb: 10,
    videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 100,
    fileFormats: ['pdf'], fileMaxSizeMb: 10,
};
export const DEFAULT_MAX_FILES = 9;

export function uploadLimitsLabel(settings: SystemMediaUploadSettings, types: readonly UploadType[] = ALL_UPLOAD_TYPES): string {
    return types.map((type) => type === 'image' ? `图片不超过 ${settings.imageMaxSizeMb} MB`
        : type === 'video' ? `视频不超过 ${settings.videoMaxSizeMb} MB` : `普通文件不超过 ${settings.fileMaxSizeMb} MB`).join('，');
}

export function isImageUrl(url: string): boolean {
    return isImageFile(url);
}

export function fileUploadError(file: File, settings = DEFAULT_UPLOAD_SETTINGS): string | null {
    const extension = fileExtension(file.name);
    const maxSize = isVideoFile(file.name) ? settings.videoMaxSizeMb
        : IMAGE_EXTENSIONS.has(extension) ? settings.imageMaxSizeMb : settings.fileMaxSizeMb;
    if (isVideoFile(file.name) && !settings.videoFormats.includes(extension)) return '该视频格式未启用';
    if (!isVideoFile(file.name) && !IMAGE_EXTENSIONS.has(extension) && !settings.fileFormats.includes(extension)) return '不支持该文件类型';
    if (IMAGE_EXTENSIONS.has(extension) && !settings.imageFormats.includes(extension)) return '该图片格式未启用';
    if (file.size === 0 || file.size > maxSize * 1024 * 1024) return `文件须大于 0 且不超过 ${maxSize} MB`;
    return null;
}

export function imageFileError(file: File, settings = DEFAULT_UPLOAD_SETTINGS): string | null {
    if (!settings.imageFormats.includes(fileExtension(file.name))) return `请选择 ${settings.imageFormats.join('、')} 格式的图片`;
    return fileUploadError(file, settings);
}

export function videoFileError(file: File, settings = DEFAULT_UPLOAD_SETTINGS): string | null {
    if (!settings.videoFormats.includes(fileExtension(file.name))) return `请选择 ${settings.videoFormats.join('、')} 格式的视频`;
    return fileUploadError(file, settings);
}

export function ordinaryFileError(file: File, settings = DEFAULT_UPLOAD_SETTINGS): string | null {
    if (!settings.fileFormats.includes(fileExtension(file.name))) return `请选择 ${settings.fileFormats.join('、')} 格式的文件`;
    if (file.size === 0 || file.size > settings.fileMaxSizeMb * 1024 * 1024) return `文件须大于 0 且不超过 ${settings.fileMaxSizeMb} MB`;
    return null;
}

export type UploadType = 'image' | 'video' | 'file';

export const ALL_UPLOAD_TYPES: readonly UploadType[] = ['image', 'video', 'file'];

function uploadFormats(type: UploadType, settings: SystemMediaUploadSettings): string[] {
    return type === 'image' ? settings.imageFormats : type === 'video' ? settings.videoFormats : settings.fileFormats;
}

function uploadTypesError(types: readonly UploadType[], file: File, settings: SystemMediaUploadSettings): string | null {
    const extension = fileExtension(file.name);
    const type = IMAGE_EXTENSIONS.has(extension) ? 'image' : isVideoFile(file.name) ? 'video' : 'file';
    if (!types.includes(type)) return `仅支持上传${types.map((item) => item === 'image' ? '图片' : item === 'video' ? '视频' : '文件').join('、')}`;
    return type === 'image' ? imageFileError(file, settings) : type === 'video' ? videoFileError(file, settings) : ordinaryFileError(file, settings);
}

type UploadFile = (file: File, onProgress?: (percent: number) => void) => Promise<string | { url: string }>;

type FileUploadProps = {
    disabled?: boolean;
    uploadTypes?: readonly UploadType[];
    onUpload?: UploadFile;
    onUploadingChange?: (uploading: boolean) => void;
    maxFiles?: number;
} & (
    | { multiple?: false; value: string; onChange: (value: string) => void }
    | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

/** 文件字段统一入口。默认上传到 system 资源库；业务可注入上传动作。 */
export function FileUpload(props: FileUploadProps) {
    const { disabled = false, uploadTypes = ALL_UPLOAD_TYPES, onUpload, onUploadingChange, maxFiles = DEFAULT_MAX_FILES } = props;
    const upload = useUploadSystemFile();
    const settingsQuery = useUploadSettings();
    const settings = settingsQuery.data ?? DEFAULT_UPLOAD_SETTINGS;
    const uploadNoun = uploadTypes.length === ALL_UPLOAD_TYPES.length ? '文件' : uploadTypes.map((type) => type === 'image' ? '图片' : type === 'video' ? '视频' : '文件').join('、');
    const inputRef = useRef<HTMLInputElement>(null);
    const busy = useRef(false);
    const dragIndexRef = useRef<number | null>(null);
    const mounted = useRef(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ index: number; total: number; percent: number | null } | null>(null);
    const uploadDisabled = disabled || uploading || !settingsQuery.data;
    const [failed, setFailed] = useState<File[]>([]);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [insertPosition, setInsertPosition] = useState<{ index: number; side: 'before' | 'after' } | null>(null);
    const urls = useMemo(() => props.multiple ? props.value : props.value ? [props.value] : [], [props.multiple, props.value]);
    const urlsRef = useRef(urls);

    useEffect(() => { urlsRef.current = urls; }, [urls]);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const updateUrls = (next: string[]) => {
        urlsRef.current = next;
        if (props.multiple) props.onChange(next);
        else props.onChange(next[0] ?? '');
    };

    const moveFile = (from: number, to: number) => {
        if (!props.multiple || disabled || uploading || from === to || to < 0 || to >= urlsRef.current.length) return;
        const next = [...urlsRef.current];
        const [moved] = next.splice(from, 1);
        if (!moved) return;
        next.splice(to, 0, moved);
        updateUrls(next);
    };

    const insertionAt = (event: DragEvent<HTMLDivElement>, index: number) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const side: 'before' | 'after' = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
        const slot = index + (side === 'after' ? 1 : 0);
        return { side, slot, to: slot > (dragIndexRef.current ?? -1) ? slot - 1 : slot };
    };

    const uploadFiles = async (files: File[]) => {
        if (disabled || busy.current || files.length === 0) return;
        if (!settingsQuery.data) {
            Toast.error('上传配置尚未加载，请稍后重试');
            return;
        }
        busy.current = true;
        setUploading(true);
        onUploadingChange?.(true);
        const failures: File[] = [];
        const batch = props.multiple ? files : files.slice(0, 1);
        for (const [index, file] of batch.entries()) {
            if (props.multiple && urlsRef.current.length >= maxFiles) {
                Toast.warning(`最多上传 ${maxFiles} 个文件`);
                break;
            }
            const error = uploadTypesError(uploadTypes, file, settingsQuery.data);
            if (error) {
                Toast.error(error);
                continue;
            }
            try {
                setUploadProgress({ index: index + 1, total: batch.length, percent: onUpload ? null : Math.round(index / batch.length * 100) });
                const reportProgress = (percent: number) => {
                    if (mounted.current) setUploadProgress({ index: index + 1, total: batch.length, percent: Math.round((index + percent / 100) / batch.length * 100) });
                };
                const result = onUpload ? await onUpload(file, reportProgress) : await upload.uploadWithProgress(file, reportProgress);
                const url = typeof result === 'string' ? result : result.url;
                if (!url) throw new Error('上传未返回文件地址');
                if (mounted.current) updateUrls(props.multiple ? [...urlsRef.current, url] : [url]);
            } catch {
                if (onUpload) Toast.error('文件上传失败，请重试');
                failures.push(file);
            }
        }
        busy.current = false;
        if (mounted.current) {
            setFailed(failures);
            setUploading(false);
            setUploadProgress(null);
            onUploadingChange?.(false);
        }
    };

    return (
        <div className="file-upload">
            <div className="file-upload__grid" onDragLeave={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setInsertPosition(null);
            }}>
                {urls.map((url, index) => (
                    <div
                        className={`file-upload__item${dragIndex === index ? ' file-upload__item--dragging' : ''}${insertPosition?.index === index ? ` file-upload__item--insert-${insertPosition.side}` : ''}`}
                        key={`${url}:${index}`}
                        draggable={props.multiple && !disabled && !uploading}
                        onDragStart={(event) => {
                            dragIndexRef.current = index;
                            setDragIndex(index);
                            setInsertPosition(null);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', String(index));
                        }}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = dragIndexRef.current !== null ? 'move' : 'copy';
                            if (dragIndexRef.current !== null) {
                                const insertion = insertionAt(event, index);
                                setInsertPosition(insertion.to === dragIndexRef.current ? null : { index, side: insertion.side });
                            }
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            if (dragIndexRef.current !== null) moveFile(dragIndexRef.current, insertionAt(event, index).to);
                            else void uploadFiles(Array.from(event.dataTransfer.files));
                            dragIndexRef.current = null;
                            setDragIndex(null);
                            setInsertPosition(null);
                        }}
                        onDragEnd={() => { dragIndexRef.current = null; setDragIndex(null); setInsertPosition(null); }}
                        title={props.multiple ? '拖动文件可调整顺序' : undefined}
                    >
                        <div className="file-upload__frame">
                            {isImageUrl(url)
                                ? <img src={url} alt={`已上传图片 ${index + 1}`} />
                                : <FileTypeIcon name={url} />}
                            <div className="file-upload__actions">
                                {props.multiple && <Button size="small" theme="borderless" icon={<ArrowLeft size={14} />} aria-label={`前移文件 ${index + 1}`} disabled={disabled || uploading || index === 0} onClick={() => moveFile(index, index - 1)} />}
                                <Button size="small" theme="borderless" icon={isImageUrl(url) || isPdfFile(url) ? <Eye size={14} /> : isVideoFile(url) ? <Play size={14} /> : <Download size={14} />} aria-label={`${isImageUrl(url) ? '预览图片' : isPdfFile(url) ? '预览 PDF' : isVideoFile(url) ? '播放视频' : '下载文件'} ${index + 1}`} onClick={() => isImageUrl(url) ? setPreviewIndex(index) : isPdfFile(url) ? setPreviewPdfUrl(url) : isVideoFile(url) ? setPreviewVideoUrl(url) : openFileUrl(url)} />
                                <Button size="small" type="danger" theme="borderless" icon={<Trash2 size={14} />} aria-label={`移除文件 ${index + 1}`} disabled={disabled || uploading} onClick={() => updateUrls(urlsRef.current.filter((_, item) => item !== index))} />
                                {props.multiple && <Button size="small" theme="borderless" icon={<ArrowRight size={14} />} aria-label={`后移文件 ${index + 1}`} disabled={disabled || uploading || index === urls.length - 1} onClick={() => moveFile(index, index + 1)} />}
                            </div>
                        </div>
                    </div>
                ))}
                {(props.multiple ? urls.length < maxFiles : true) && <div
                    className={`file-upload__dropzone${uploadProgress ? ' file-upload__dropzone--uploading' : ''}`}
                    role="button"
                    tabIndex={uploadDisabled ? -1 : 0}
                    aria-label={props.multiple ? `上传多个${uploadNoun}` : `上传${uploadNoun}`}
                    aria-disabled={uploadDisabled}
                    onClick={() => { if (!uploadDisabled) inputRef.current?.click(); }}
                    onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !uploadDisabled) { event.preventDefault(); inputRef.current?.click(); } }}
                    onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = dragIndexRef.current !== null ? 'move' : 'copy';
                        if (dragIndexRef.current !== null) setInsertPosition(dragIndexRef.current === urls.length - 1 ? null : { index: urls.length - 1, side: 'after' });
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        if (dragIndexRef.current !== null) moveFile(dragIndexRef.current, urls.length - 1);
                        else void uploadFiles(Array.from(event.dataTransfer.files));
                        dragIndexRef.current = null;
                        setDragIndex(null);
                        setInsertPosition(null);
                    }}
                >
                    {uploadProgress ? <div className="file-upload__progress" role="status">
                        <strong>{uploadProgress.percent === null ? '上传中…' : `${uploadProgress.percent}%`}</strong>
                        {uploadProgress.percent !== null && <Progress percent={uploadProgress.percent} size="small" />}
                        <span>{uploadProgress.percent === 100 ? '等待确认' : uploadProgress.total > 1 ? `${uploadProgress.index}/${uploadProgress.total}` : '上传中'}</span>
                    </div> : <>
                        <FilePlus2 size={20} />
                        <span>{urls.length && !props.multiple ? `更换${uploadNoun}` : `上传${uploadNoun}`}</span>
                    </>}
                </div>}
            </div>
            {props.multiple && <small>{settingsQuery.data ? uploadLimitsLabel(settings, uploadTypes) : '正在读取上传配置…'}；最多 {maxFiles} 个（当前 {urls.length}/{maxFiles}）</small>}
            {settingsQuery.isError && <Button size="small" onClick={() => void settingsQuery.refetch()}>上传配置加载失败，重试</Button>}
            <input ref={inputRef} hidden type="file" disabled={uploadDisabled} accept={[...new Set(uploadTypes.flatMap((type) => uploadFormats(type, settings)))].map((item) => `.${item}`).join(',')} multiple={props.multiple} onChange={(event) => { void uploadFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
            {failed.length > 0 && (
                <Button size="small" icon={<RotateCcw size={14} />} disabled={uploadDisabled} onClick={() => void uploadFiles(failed)}>
                    重试失败的文件（{failed.length}）
                </Button>
            )}
            {previewIndex !== null && urls[previewIndex] && <ImagePreview src={urls.filter(isImageUrl)} visible currentIndex={urls.filter(isImageUrl).indexOf(urls[previewIndex])} initialZoom={1} onChange={(index) => setPreviewIndex(urls.indexOf(urls.filter(isImageUrl)[index] ?? ''))} onVisibleChange={(visible) => { if (!visible) setPreviewIndex(null); }} />}
            <VideoPreview url={previewVideoUrl} title="视频预览" onClose={() => setPreviewVideoUrl(null)} />
            <PdfPreview url={previewPdfUrl} title="PDF 预览" onClose={() => setPreviewPdfUrl(null)} />
        </div>
    );
}
