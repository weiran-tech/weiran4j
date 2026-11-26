import { Button, Modal } from '@douyinfe/semi-ui';
import { Download } from 'lucide-react';
import { openFileUrl } from './fileUrl';
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
    return <Modal visible={url !== null} title={title} width={900} footer={null} onCancel={onClose}>
        {url && <>
            <video className="video-preview__player" src={url} controls playsInline preload="metadata">
                当前浏览器不支持播放此视频。
            </video>
            <Button size="small" theme="borderless" icon={<Download size={14} />} onClick={() => openFileUrl(url)}>
                无法播放？在浏览器中打开或下载
            </Button>
        </>}
    </Modal>;
}
