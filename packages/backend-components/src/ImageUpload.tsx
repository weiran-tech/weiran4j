import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import './ImageUpload.css';

export type UploadImage = (file: File, onProgress: (percent: number) => void) => Promise<string>;

export interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    upload: UploadImage;
    formats: readonly string[];
    maxSizeMb: number;
    disabled?: boolean;
    onUploadingChange?: (uploading: boolean) => void;
    onError?: (message: string) => void;
}

export function imageUploadError(file: File, formats: readonly string[], maxSizeMb: number): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!formats.some((format) => format.toLowerCase().replace(/^\./, '') === extension)) {
        return `请选择 ${formats.join('、')} 格式的图片`;
    }
    if (file.size === 0 || file.size > maxSizeMb * 1024 * 1024) {
        return `文件须大于 0 且不超过 ${maxSizeMb} MB`;
    }
    return null;
}

export function ImageUpload({ value, onChange, upload, formats, maxSizeMb, disabled = false, onUploadingChange, onError }: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const busy = useRef(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [failedFile, setFailedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(false);

    const send = async (file?: File) => {
        if (!file || disabled || busy.current) return;
        const error = imageUploadError(file, formats, maxSizeMb);
        if (error) { onError?.(error); return; }
        busy.current = true;
        setUploading(true);
        setProgress(null);
        onUploadingChange?.(true);
        try {
            const url = await upload(file, (percent) => setProgress(Math.max(0, Math.min(100, Math.round(percent)))));
            if (!url) throw new Error('上传未返回图片地址');
            onChange(url);
            setFailedFile(null);
        } catch (cause) {
            setFailedFile(file);
            onError?.(cause instanceof Error ? cause.message : '图片上传失败，请重试');
        } finally {
            busy.current = false;
            setUploading(false);
            setProgress(null);
            onUploadingChange?.(false);
        }
    };

    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        void send(file);
    };
    const onDrop = (event: DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        void send(event.dataTransfer.files[0]);
    };

    return <div className="weiran-image-upload">
        {value && <div className="weiran-image-upload__preview">
            <button type="button" disabled={disabled || uploading} onClick={() => setPreview(true)} aria-label="预览图片">
                <img src={value} alt="已上传图片" />
            </button>
            <button type="button" disabled={disabled || uploading} onClick={() => onChange('')} aria-label="移除图片">移除</button>
        </div>}
        <button type="button" className="weiran-image-upload__dropzone" disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            {uploading ? `上传中${progress === null ? '…' : ` ${progress}%`}` : value ? '更换图片' : '上传图片'}
        </button>
        <input ref={inputRef} hidden type="file" accept={formats.map((format) => `.${format.replace(/^\./, '')}`).join(',')}
            disabled={disabled || uploading} onChange={onInputChange} />
        {failedFile && !uploading && <button type="button" disabled={disabled} onClick={() => void send(failedFile)}>重试上传</button>}
        {preview && value && <div className="weiran-image-upload__lightbox" role="dialog" aria-label="图片预览" onClick={() => setPreview(false)}>
            <button type="button" onClick={() => setPreview(false)} aria-label="关闭预览">×</button>
            <img src={value} alt="图片预览" />
        </div>}
    </div>;
}
