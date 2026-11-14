import { useEffect, useRef } from 'react';
import { subscribePermissionRejected } from '@/utils/authorization-events';

/** 唯一校准生命周期；业务和 docs 复用，可见在线时 30s，恢复时立即读。 */
export function useAuthorizationCalibration(session: string | null, refresh: () => Promise<unknown>) {
    const latest = useRef(refresh);
    useEffect(() => { latest.current = refresh; }, [refresh]);
    useEffect(() => {
        if (!session) return;
        let pending = false;
        let rejectedAt = -Infinity;
        let disposed = false;
        const active = () => document.visibilityState !== 'hidden' && navigator.onLine;
        const run = async () => {
            if (disposed || pending || !active()) return;
            pending = true;
            try { await latest.current(); } finally { pending = false; }
        };
        const resume = () => { void run(); };
        const timer = window.setInterval(resume, 30_000);
        document.addEventListener('visibilitychange', resume);
        window.addEventListener('online', resume);
        const unsubscribe = subscribePermissionRejected((source) => {
            if (source !== session || Date.now() - rejectedAt < 5_000) return;
            rejectedAt = Date.now();
            void run();
        });
        return () => {
            disposed = true;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', resume);
            window.removeEventListener('online', resume);
            unsubscribe();
        };
    }, [session]);
}
