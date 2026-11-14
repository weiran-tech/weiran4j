import { EditConflictFeedback } from '@/components/EditConflictFeedback';
import { useEditConflict } from '@/hooks/useEditConflict';
import { http } from '@/utils/request';
import { Form, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef, useState } from 'react';
import { STATUS_OPTIONS } from '@/components/StatusTag';
import { useSaveRole } from '@/hooks/queries/roles';
import { useFormCloseGuard } from '@/hooks/useFormCloseGuard';
import type { RoleView, Status } from '@/types/api';

interface RoleForm {
    name: string;
    code: string;
    description: string;
    sort: number;
    status: Status;
}

/** 契约 §6.3 */
const ROLE_CODE_RULE = /^[a-z][a-z0-9_]{1,63}$/;

interface Props {
    record: RoleView | null;
    onClose: () => void;
}

export function RoleFormModal({ record: initialRecord, onClose }: Props) {
    const [record, setRecord] = useState(initialRecord);
    const [formKey, setFormKey] = useState(0);
    const conflict = useEditConflict();
    const reload = () => conflict.reload(async () => {
        if (!record) return;
        const latest = await http.get<RoleView>(`/api-backend/system/role/get/${record.id}`);
        setRecord(latest); setFormKey((key) => key + 1);
    });
    const isEdit = record !== null;
    const api = useRef<FormApi<RoleForm> | null>(null);
    const save = useSaveRole();
    const guard = useFormCloseGuard(api, onClose);

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v || conflict.conflict) return;
        await conflict.run(() => save.mutateAsync({
            id: record?.id,
            body: { ...(record ? { version: record.version } : {}), name: v.name, code: v.code, description: v.description || null, sort: v.sort ?? 0, status: v.status },
        }));
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑角色' : '新增角色'}
            onCancel={guard.requestClose}
            onOk={() => guard.submit(submit).catch(() => undefined)}
            okButtonProps={{ loading: guard.saving, disabled: guard.saving || conflict.conflict || conflict.reloading }}
            cancelButtonProps={{ disabled: guard.saving }}
            closable={!guard.saving}
            closeOnEsc={!guard.saving}
            maskClosable={false}
        >
            <EditConflictFeedback {...conflict} onReload={reload} />
            <Form<RoleForm>
                key={formKey}
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={{
                    name: record?.name ?? '',
                    code: record?.code ?? '',
                    description: record?.description ?? '',
                    sort: record?.sort ?? 0,
                    status: record?.status ?? 'enabled',
                }}
                labelPosition="left"
                labelWidth={90}
            >
                <Form.Input field="name" label="角色名称" maxLength={64} rules={[{ required: true, message: '请输入角色名称' }]} />
                <Form.Input
                    field="code"
                    label="角色编码"
                    maxLength={64}
                    disabled={record?.isBuiltin ?? false}
                    placeholder="小写字母开头，如 editor"
                    rules={[
                        { required: true, message: '请输入角色编码' },
                        { pattern: ROLE_CODE_RULE, message: '小写字母开头，仅含小写字母、数字、下划线，2–64 位' },
                    ]}
                />
                <Form.TextArea field="description" label="描述" maxLength={256} rows={3} />
                <Form.InputNumber field="sort" label="排序" min={0} style={{ width: '100%' }} />
                <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} />
            </Form>
        </Modal>
    );
}
