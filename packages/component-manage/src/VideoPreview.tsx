import { Button, Modal } from '@douyinfe/semi-ui';
import { Download } from 'lucide-react';
import { openFileUrl, safeFileUrl } from './fileUrl';
import './VideoPreview.css';

/** 关闭弹窗即卸载 video，停止播放与下载。 */
export interface VideoPreviewProps {
    url: string | null;
    title: string;
    onClose: () => void;
}

export function VideoPreview({
    url,
    title,
    onClose,
}: VideoPreviewProps) {
    const mediaUrl = url === null ? null : safeFileUrl(url);
    return <Modal visible={url !== null} title={title} width={900} footer={null} onCancel={onClose}>
        {url && !mediaUrl && <p role="alert">视频地址无效，仅支持 HTTP / HTTPS 地址。</p>}
        {mediaUrl && <>
            <video className="video-preview__player" src={mediaUrl} controls playsInline preload="metadata">
                当前浏览器不支持播放此视频。
            </video>
            <Button size="small" theme="borderless" icon={<Download size={14} />} onClick={() => openFileUrl(mediaUrl)}>
                无法播放？在浏览器中打开或下载
            </Button>
        </>}
    </Modal>;
}
