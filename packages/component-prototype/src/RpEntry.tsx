import { GitCompareArrows, Monitor, Smartphone } from 'lucide-react';
import './prototype-entry.css';

const icons = { changes: GitCompareArrows, manage: Monitor, mobile: Smartphone };
export function RpEntry({ kind, to, children, onNavigate }: { kind: keyof typeof icons; to: string; children: React.ReactNode; onNavigate?: (path: string) => void }) {
    const Icon = icons[kind];
    return <a onClick={event => { if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onNavigate(to); } }} className={`prototype-scope prototype-entry prototype-entry-${kind}`} href={to}><Icon size={16} aria-hidden="true" /><span>{children}</span></a>;
}
