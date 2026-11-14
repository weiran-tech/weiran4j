import { Modal } from '@douyinfe/semi-ui';
import { useEffect, useRef, useState } from 'react';

export function isEditConflict(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 100007;
}

/** 冲突期间不允许重放旧草稿，只有确认且读取成功才替换基准。 */
export function useEditConflict() {
    const [conflict, setConflict] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [reloadError, setReloadError] = useState(false);
    const blocked = useRef(false);
    const confirmation = useRef<ReturnType<typeof Modal.confirm> | null>(null);
    useEffect(() => () => confirmation.current?.destroy(), []);
    const run = async (save: () => Promise<unknown>) => {
        if (blocked.current) return false;
        try { await save(); return true; }
        catch (error) {
            if (isEditConflict(error)) { blocked.current = true; setConflict(true); }
            throw error;
        }
    };
    const reload = (replace: () => Promise<void>) => {
        if (confirmation.current) return;
        confirmation.current = Modal.confirm({
            motion: false, title: '重新加载最新数据？', content: '尚未保存的输入将被替换。', okText: '重新加载', cancelText: '保留输入',
            maskClosable: false,
            onCancel: () => { confirmation.current?.destroy(); confirmation.current = null; },
            onOk: async () => {
                setReloading(true); setReloadError(false);
                try { await replace(); blocked.current = false; setConflict(false); }
                catch { setReloadError(true); }
                finally { confirmation.current?.destroy(); confirmation.current = null; setReloading(false); }
            },
        });
    };
    const reset = () => { blocked.current = false; setConflict(false); setReloadError(false); };
    return { conflict, reloading, reloadError, run, reload, reset };
}
