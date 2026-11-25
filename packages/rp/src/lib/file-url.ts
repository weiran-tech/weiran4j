import { Toast } from '@douyinfe/semi-ui';

export function safeFileUrl(url: string): string | null {
    try {
        const target = new URL(url, window.location.origin);
        if (!['http:', 'https:'].includes(target.protocol)) throw new Error('invalid protocol');
        return target.href;
    } catch {
        return null;
    }
}

export function openFileUrl(url: string): void {
    const href = safeFileUrl(url);
    if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
    } else {
        Toast.error('文件地址无效');
    }
}
