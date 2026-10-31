import { Button, Modal, Typography } from '@douyinfe/semi-ui';
import { ExternalLink } from 'lucide-react';
import { openFileUrl, safeFileUrl } from './fileUrl';
import './PdfPreview.css';

/** 使用浏览器内置 PDF 阅读器预览；弹窗关闭后卸载阅读器。 */
export interface PdfPreviewProps {
    url: string | null;
    title: string;
    onClose: () => void;
}

export function PdfPreview({
    url,
    title,
    onClose,
}: PdfPreviewProps) {
    const href = url ? safeFileUrl(url) : null;
    return <Modal visible={url !== null} title={title} width={900} footer={null} onCancel={onClose}>
        {href
            ? <>
                <iframe className="pdf-preview__frame" src={href} title={title} />
                <Button size="small" theme="borderless" icon={<ExternalLink size={14} />} onClick={() => openFileUrl(href)}>
                    在浏览器标签页中打开
                </Button>
            </>
            : <Typography.Text type="danger">PDF 地址无效</Typography.Text>}
    </Modal>;
}
