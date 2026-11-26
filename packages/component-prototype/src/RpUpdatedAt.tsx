import './updated-at.css';

export function RpUpdatedAt({ updatedAt, timeZone = 'Asia/Shanghai' }: { updatedAt: string; timeZone?: string }) {
    const updated = new Date(updatedAt);
    const label = new Intl.DateTimeFormat('zh-CN', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(updated).replaceAll('/', '-');
    return <div className="prototype-scope prototype-updated-at" title="原型内容更新时间（UTC+8），随源码维护"><span>原型更新于 <time dateTime={updatedAt}>{label}</time></span></div>;
}
