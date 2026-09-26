/** 只允许站内相对路径，防开放重定向；非法时回到根路径 */
export function safeRedirect(raw: string | null): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return '/';
    return raw;
}
