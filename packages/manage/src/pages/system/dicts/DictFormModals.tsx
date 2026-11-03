import { Form, Modal, Tag, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { TagProps } from '@douyinfe/semi-ui/lib/es/tag';
import { useRef } from 'react';
import { STATUS_OPTIONS } from '@/components/StatusTag';
import { useSaveDict, useSaveDictItem } from '@/hooks/queries/dicts';
import type { DictItemView, DictView, Status } from '@/types/api';

/** Semi Tag 预置色，DictTag 按此渲染 */
const TAG_COLORS = ['grey', 'blue', 'cyan', 'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'red', 'pink', 'purple', 'violet', 'indigo', 'teal'] as const;

const COLOR_OPTIONS = TAG_COLORS.map((c) => ({
    value: c,
    label: (
        <Tag size="small" color={c as TagProps['color']}>
            {c}
        </Tag>
    ),
}));

interface DictForm {
    name: string;
    code: string;
    description: string;
    status: Status;
}

export function DictFormModal({ record, onClose }: { record: DictView | null; onClose: () => void }) {
    const isEdit = record !== null;
    const api = useRef<FormApi<DictForm> | null>(null);
    const save = useSaveDict();

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        await save.mutateAsync({
            id: record?.id,
            body: { name: v.name, code: v.code.trim(), description: v.description || null, status: v.status },
        });
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑字典' : '新增字典'}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<DictForm>
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={{
                    name: record?.name ?? '',
                    code: record?.code ?? '',
                    description: record?.description ?? '',
                    status: record?.status ?? 'enabled',
                }}
                labelPosition="left"
                labelWidth={90}
            >
                <Form.Input field="name" label="字典名称" maxLength={64} rules={[{ required: true, message: '请输入字典名称' }]} />
                <Form.Input
                    field="code"
                    label="字典编码"
                    maxLength={64}
                    disabled={record?.isBuiltin ?? false}
                    placeholder="如 sys_user_gender"
                    rules={[{ required: true, message: '请输入字典编码' }]}
                />
                <Form.TextArea field="description" label="描述" rows={3} maxLength={256} />
                <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} />
            </Form>
        </Modal>
    );
}

interface DictItemForm {
    label: string;
    value: string;
    color?: string;
    sort: number;
    status: Status;
    remark: string;
}

export function DictItemFormModal({ dictId, record, onClose }: { dictId: number; record: DictItemView | null; onClose: () => void }) {
    const isEdit = record !== null;
    const api = useRef<FormApi<DictItemForm> | null>(null);
    const save = useSaveDictItem();

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        await save.mutateAsync({
            dictId,
            itemId: record?.id,
            body: { label: v.label, value: v.value, color: v.color || null, sort: v.sort ?? 0, status: v.status, remark: v.remark || null },
        });
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑字典项' : '新增字典项'}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<DictItemForm>
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={{
                    label: record?.label ?? '',
                    value: record?.value ?? '',
                    ...(record?.color ? { color: record.color } : {}),
                    sort: record?.sort ?? 0,
                    status: record?.status ?? 'enabled',
                    remark: record?.remark ?? '',
                }}
                labelPosition="left"
                labelWidth={90}
            >
                <Form.Input field="label" label="标签" maxLength={64} rules={[{ required: true, message: '请输入标签' }]} />
                <Form.Input field="value" label="值" maxLength={64} rules={[{ required: true, message: '请输入值' }]} />
                <Form.Select field="color" label="颜色" optionList={COLOR_OPTIONS} style={{ width: '100%' }} showClear />
                <Form.InputNumber field="sort" label="排序" min={0} style={{ width: '100%' }} />
                <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} />
                <Form.TextArea field="remark" label="备注" rows={2} maxLength={256} />
            </Form>
        </Modal>
    );
}
