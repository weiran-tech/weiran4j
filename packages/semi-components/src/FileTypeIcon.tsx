import { File, FileArchive, FileSpreadsheet, FileText, FileVideo, Presentation } from 'lucide-react';
import './FileTypeIcon.css';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov']);

export function fileExtension(name: string): string {
    const path = name.split(/[?#]/)[0] ?? '';
    const filename = path.split('/').pop() ?? '';
    const dot = filename.lastIndexOf('.');
    return dot < 0 ? '' : filename.slice(dot + 1).toLowerCase();
}

export function isImageFile(name: string): boolean {
    return IMAGE_EXTENSIONS.has(fileExtension(name));
}

export function isVideoFile(name: string): boolean {
    return VIDEO_EXTENSIONS.has(fileExtension(name));
}

export function isPdfFile(name: string): boolean {
    return fileExtension(name) === 'pdf';
}

type FileKind = 'video' | 'pdf' | 'word' | 'presentation' | 'spreadsheet' | 'archive' | 'text' | 'file';

function fileKind(extension: string): FileKind {
    if (VIDEO_EXTENSIONS.has(extension)) return 'video';
    if (extension === 'pdf') return 'pdf';
    if (extension === 'doc' || extension === 'docx') return 'word';
    if (extension === 'ppt' || extension === 'pptx') return 'presentation';
    if (extension === 'xls' || extension === 'xlsx') return 'spreadsheet';
    if (extension === 'zip') return 'archive';
    if (extension === 'txt' || extension === 'csv') return 'text';
    return 'file';
}

const FILE_LABELS: Record<FileKind, string> = {
    video: 'VIDEO',
    pdf: 'PDF',
    word: 'DOC',
    presentation: 'PPT',
    spreadsheet: 'XLS',
    archive: 'ZIP',
    text: 'TXT',
    file: 'FILE',
};

const FILE_ICONS = {
    video: FileVideo,
    pdf: FileText,
    word: FileText,
    presentation: Presentation,
    spreadsheet: FileSpreadsheet,
    archive: FileArchive,
    text: FileText,
    file: File,
};

/** 用颜色、文件形状和扩展类型共同标识常见文件。 */
export function FileTypeIcon({ name, size = 72 }: { name: string; size?: number }) {
    const kind = fileKind(fileExtension(name));
    const Icon = FILE_ICONS[kind];
    return <span
        className={`file-type-icon file-type-icon--${kind}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${FILE_LABELS[kind]} 文件`}
    >
        <Icon size={Math.round(size * 0.46)} strokeWidth={1.8} aria-hidden="true" />
        <span className="file-type-icon__label">{FILE_LABELS[kind]}</span>
    </span>;
}
