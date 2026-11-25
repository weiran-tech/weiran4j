import { useQuery } from '@tanstack/react-query';
import type { Handoff, Confirmations } from '../../prototype/handoff.mjs';
export type HandoffReport = { syncedAt: string | null; versions: Record<string, { number: number; url: string; updatedAt: string; state: string; handoff: Handoff | null; errors: string[]; problems?: { number: number; title: string; url: string; state: string; blocker: boolean; owners: string[]; decision: string | null }[]; confirmations?: Confirmations }> };
export function useHandoffs() {
    return useQuery({ queryKey: ['prototype-handoffs'], queryFn: async (): Promise<HandoffReport> => {
        const response = await fetch('/handoffs/index.json');
        if (response.status === 404) return { syncedAt: null, versions: {} };
        if (!response.ok) throw new Error('交接摘要加载失败');
        const value = await response.json() as HandoffReport;
        if (!value || !value.versions || !('syncedAt' in value)) throw new Error('交接摘要格式不正确');
        return value;
    }, retry: false });
}
