import { Button, Input, Modal, Progress, Select, Table, Tabs, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Copy, Download, Eye, FilePlus2, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { FileTypeIcon, isPdfFile } from '@/components/FileTypeIcon';
import { DEFAULT_UPLOAD_SETTINGS, fileUploadError, uploadLimitsLabel } from '@/components/FileUpload';
import { PdfPreview } from '@/components/PdfPreview';
import { VideoPreview } from '@/components/VideoPreview';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useDeleteSystemMediaFile, useSystemMediaFiles, useUploadSettings, useUploadSystemFile } from '@/hooks/queries/system-media';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import { openFileUrl } from '@/lib/file-url';
import type { SystemMediaFileQuery, SystemMediaFileView } from '@/types/api';
import UploadSettingsTab from './upload-settings/UploadSettingsPage';
import './media-library.css';

interface UploadItem {
    key: string;
    file: File;
    state: 'uploading' | 'success' | 'error';
    error: string | undefined;
    progress: number;
}

type Category = SystemMediaFileQuery['category'];
const CATEGORY_OPTIONS = [
    { label: '图片', value: 'image' },
    { label: '视频', value: 'video' },
    { label: '文档', value: 'document' },
    { label: '压缩包', value: 'archive' },
];

function formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaLibraryTab() {
    const inputRef = useRef<HTMLInputElement>(null);
    const { tableProps, pageSize: initialPageSize, pageSizeOpts } = useTableDefaults();
    const [draftKeyword, setDraftKeyword] = useState('');
    const [draftCategory, setDraftCategory] = useState<Category>();
    const [keyword, setKeyword] = useState('');
    const [category, setCategory] = useState<Category>();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [preview, setPreview] = useState<SystemMediaFileView | null>(null);
    const [videoPreview, setVideoPreview] = useState<SystemMediaFileView | null>(null);
    const [pdfPreview, setPdfPreview] = useState<SystemMediaFileView | null>(null);
    const [deleting, setDeleting] = useState<SystemMediaFileView | null>(null);
    const query = useSystemMediaFiles({ page, pageSize, ...(keyword ? { keyword } : {}), ...(category ? { category } : {}) });
    const upload = useUploadSystemFile();
    const settingsQuery = useUploadSettings();
    const settings = settingsQuery.data ?? DEFAULT_UPLOAD_SETTINGS;
    const remove = useDeleteSystemMediaFile();

    const search = () => { setKeyword(draftKeyword.trim()); setCategory(draftCategory); setPage(1); };
    const reset = () => { setDraftKeyword(''); setDraftCategory(undefined); setKeyword(''); setCategory(undefined); setPage(1); };
    const conditions: SearchCondition[] = [
        ...(keyword ? [{ key: 'keyword', label: '文件名', value: keyword, onRemove: () => { setKeyword(''); setDraftKeyword(''); setPage(1); } }] : []),
        ...(category ? [{ key: 'category', label: '文件类型', value: CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category, onRemove: () => { setCategory(undefined); setDraftCategory(undefined); setPage(1); } }] : []),
    ];

    const uploadOne = async (item: UploadItem) => {
        setUploads((current) => current.map((row) => row.key === item.key ? { ...row, state: 'uploading', error: undefined, progress: 0 } : row));
        if (!settingsQuery.data) {
            setUploads((current) => current.map((row) => row.key === item.key ? { ...row, state: 'error', error: '上传配置尚未加载' } : row));
            return;
        }
        const error = fileUploadError(item.file, settingsQuery.data);
        if (error) {
            setUploads((current) => current.map((row) => row.key === item.key ? { ...row, state: 'error', error } : row));
            return;
        }
        try {
            await upload.uploadWithProgress(item.file, (progress) => {
                setUploads((current) => current.map((row) => row.key === item.key ? { ...row, progress } : row));
            });
            setUploads((current) => current.map((row) => row.key === item.key ? { ...row, state: 'success', progress: 100 } : row));
        } catch (cause) {
            setUploads((current) => current.map((row) => row.key === item.key ? { ...row, state: 'error', error: cause instanceof Error ? cause.message : '上传失败' } : row));
        }
    };
    const chooseFiles = (files: File[]) => {
        const selected: UploadItem[] = files.map((file, index) => ({ key: `${Date.now()}-${index}-${file.name}`, file, state: 'uploading', error: undefined, progress: 0 }));
        setUploads((current) => [...selected, ...current]);
        void (async () => { for (const item of selected) await uploadOne(item); })();
    };
    const copyUrl = async (url: string) => {
        try { await navigator.clipboard.writeText(url); Toast.success('链接已复制'); }
        catch { Toast.error('复制失败，请检查浏览器剪贴板权限'); }
    };
    const deleteFile = async () => {
        if (!deleting) return;
        try {
            await remove.mutateAsync(deleting.id);
            Toast.success('文件已删除');
            setDeleting(null);
        } catch (cause) { Toast.error(cause instanceof Error ? cause.message : '删除失败'); }
    };

    const columns: ColumnProps<SystemMediaFileView>[] = [
        { title: 'ID', dataIndex: 'id', width: 90 },
        { title: '文件', dataIndex: 'originalName', width: 320, render: (_: unknown, row) => <div className="media-library__file-cell">
            {row.category === 'image' ? <img src={row.url} alt="" loading="lazy" /> : <FileTypeIcon name={row.originalName} size={40} />}
            <span className="media-library__filename" title={row.originalName}>{row.originalName}</span>
        </div> },
        { title: '类型', dataIndex: 'category', width: 90, render: (value: string) => CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value },
        { title: '大小', dataIndex: 'size', width: 110, render: (value: number) => formatBytes(value) },
        { title: '引用位置', dataIndex: 'references', width: 290, render: (_: unknown, row) => row.references.length
            ? <div className="media-library__references">{row.references.map((location) => <Tag key={location}>{location}</Tag>)}</div>
            : <Typography.Text type="tertiary">未发现引用</Typography.Text> },
        { title: '上传时间', dataIndex: 'createdAt', width: 190 },
        { title: '操作', dataIndex: 'actions', width: 210, fixed: 'right' },
    ];
    const actionsOf = (row: SystemMediaFileView): TableAction[] => [
        { key: 'open', label: row.category === 'image' || isPdfFile(row.originalName) ? '预览' : row.category === 'video' ? '播放' : '下载', icon: row.category === 'image' || isPdfFile(row.originalName) ? <Eye size={14} /> : row.category === 'video' ? <Play size={14} /> : <Download size={14} />, onClick: () => row.category === 'image' ? setPreview(row) : isPdfFile(row.originalName) ? setPdfPreview(row) : row.category === 'video' ? setVideoPreview(row) : openFileUrl(row.url) },
        { key: 'copy', label: '复制链接', icon: <Copy size={14} />, onClick: () => void copyUrl(row.url) },
        { key: 'delete', label: '删除', icon: <Trash2 size={14} />, danger: true, disabled: row.references.length > 0, permission: 'system:media-library:delete', onClick: () => setDeleting(row) },
    ];
    const { columns: settledColumns, columnSettings } = useColumnSettings('system/media-library', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return <>
        <SearchToolbar
            tools={columnSettings}
            onSearch={search}
            onReset={reset}
            onRefresh={() => void query.refetch()}
            refreshing={query.isFetching}
            conditions={conditions}
            actions={<Button type="primary" theme="solid" icon={<FilePlus2 size={16} />} disabled={!settingsQuery.data} onClick={() => inputRef.current?.click()}>上传文件</Button>}
        >
            <Input placeholder="按文件名搜索" value={draftKeyword} onChange={setDraftKeyword} onEnterPress={search} showClear style={{ width: 210 }} />
            <Select placeholder="文件类型" value={draftCategory} onChange={(value) => setDraftCategory(value as Category)} optionList={CATEGORY_OPTIONS} showClear style={{ width: 130 }} />
        </SearchToolbar>
        <input ref={inputRef} type="file" multiple hidden disabled={!settingsQuery.data} aria-label="选择文件" accept={[...new Set([...settings.imageFormats, ...settings.videoFormats, ...settings.fileFormats])].map((format) => `.${format}`).join(',')} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; chooseFiles(files); }} />
        {settingsQuery.isError && <Button size="small" onClick={() => void settingsQuery.refetch()}>上传配置加载失败，重试</Button>}
        {uploads.length > 0 && <section className="media-library__uploads" aria-label="上传结果">
            <div className="media-library__uploads-title">本次上传 · {uploadLimitsLabel(settings)}</div>
            {uploads.map((item) => <div className="media-library__upload-row" key={item.key}>
                <span className="media-library__upload-name" title={item.file.name}>{item.file.name}</span>
                {item.state === 'uploading' ? <div className="media-library__upload-progress" role="status">
                    <span>{item.progress === 100 ? '等待确认' : '上传中'} {item.progress}%</span><Progress percent={item.progress} size="small" />
                </div>
                    : item.state === 'success' ? <Typography.Text type="success">已上传</Typography.Text>
                        : <><Typography.Text type="danger">{item.error}</Typography.Text><Button size="small" icon={<RefreshCw size={14} />} onClick={() => void uploadOne(item)}>重试</Button></>}
            </div>)}
        </section>}
        <Table<SystemMediaFileView>
            {...tableProps}
            rowKey="id"
            columns={tableColumns}
            dataSource={query.data?.list ?? []}
            loading={query.isFetching}
            scroll={{ x: tableScrollX(tableColumns) }}
            pagination={{ currentPage: page, pageSize, pageSizeOpts, total: query.data?.total ?? 0, showSizeChanger: true, showTotal: true, onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); } }}
        />
        {query.isError && <Button onClick={() => void query.refetch()}>加载失败，点击重试</Button>}
        <Modal visible={preview !== null} title={preview?.originalName ?? '图片预览'} footer={null} onCancel={() => setPreview(null)}>
            {preview && <img className="media-library__preview-image" src={preview.url} alt={preview.originalName} />}
        </Modal>
        <VideoPreview url={videoPreview?.url ?? null} title={videoPreview?.originalName ?? '视频预览'} onClose={() => setVideoPreview(null)} />
        <PdfPreview url={pdfPreview?.url ?? null} title={pdfPreview?.originalName ?? 'PDF 预览'} onClose={() => setPdfPreview(null)} />
        <Modal visible={deleting !== null} title="删除文件" onCancel={() => setDeleting(null)} onOk={() => void deleteFile()} okText="删除" okButtonProps={{ type: 'danger', loading: remove.isPending }}>
            <Typography.Paragraph>确定删除「{deleting?.originalName}」？</Typography.Paragraph>
        </Modal>
    </>;
}

export default function ResourceManagementPage() {
    const { hasPermission } = usePermission();
    return <PageContainer>
        <Tabs type="line">
            <Tabs.TabPane tab="资源管理" itemKey="resources">
                <MediaLibraryTab />
            </Tabs.TabPane>
            {hasPermission('system:config:list') && <Tabs.TabPane tab="上传配置" itemKey="upload">
                <UploadSettingsTab />
            </Tabs.TabPane>}
        </Tabs>
    </PageContainer>;
}
