import { Modal } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useEffect, useRef, useState, type RefObject } from 'react';

function isEmpty(value: unknown): boolean {
    return value === undefined || value === null || value === '';
}

/** Semi 注册空字段可能补 undefined/null/空串；这些变化不算实际编辑。 */
function equalValues(left: unknown, right: unknown): boolean {
    if (Object.is(left, right) || (isEmpty(left) && isEmpty(right))) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
        return left.length === right.length && left.every((value: unknown, index) => equalValues(value, right[index]));
    }
    if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return false;
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((key) => equalValues(a[key], b[key]));
}

/** 保护弹窗关闭与提交，仅在内存读取表单，不存储或记录草稿。 */
export function useFormCloseGuard<T extends object>(api: RefObject<FormApi<T> | null>, onClose: () => void) {
    const [saving, setSaving] = useState(false);
    // ref 在同一事件循环内也能拦住重复提交或关闭，不依赖下一次渲染。
    const busy = useRef(false);
    const confirmation = useRef<ReturnType<typeof Modal.confirm> | null>(null);

    useEffect(() => () => confirmation.current?.destroy(), []);

    const requestClose = () => {
        if (busy.current || confirmation.current) return;
        const form = api.current;
        if (!form || equalValues(form.getValues(), form.getInitValues())) {
            onClose();
            return;
        }
        confirmation.current = Modal.confirm({
            title: '放弃修改？',
            motion: false,
            content: '尚未保存的内容将丢失。',
            okText: '放弃修改',
            cancelText: '继续编辑',
            maskClosable: false,
            cancelButtonProps: { autoFocus: true },
            okButtonProps: { type: 'danger' },
            onOk: () => {
                confirmation.current = null;
                onClose();
            },
            onCancel: () => { confirmation.current = null; },
        });
    };

    const submit = async (save: () => Promise<void>) => {
        if (busy.current || confirmation.current) return;
        busy.current = true;
        setSaving(true);
        try {
            await save();
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return { saving, requestClose, submit };
}
