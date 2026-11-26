import { Button, Toast } from '@douyinfe/semi-ui';
import { Bot } from 'lucide-react';
import { platformLabels, statusLabels, type Release, type Platform } from './model';
import './page-identity.css';

export function RpPageIdentity({ release, page, path, platform }: { release: Release; page: { id: string; title: string }; path: string; platform: Platform }) {
    const copy = () => {
        const text = `版本：${release.id}（${statusLabels[release.status]}）\n端：${platform} / ${platformLabels[platform]}\n页面：${page.title}\n页面标识：${page.id}\n路径：${path}`;
        if (!navigator.clipboard) { Toast.error('浏览器不支持复制，请选择页面信息手动复制'); return; }
        void navigator.clipboard.writeText(text).then(() => Toast.success('页面信息已复制')).catch(() => Toast.error('复制失败，请选择页面信息手动复制'));
    };
    return <Button className="prototype-scope prototype-tell-ai" aria-label="TELL AI" icon={<Bot size={17} />} theme="light" onClick={copy}>TELL AI</Button>;
}
