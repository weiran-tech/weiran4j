import { Form, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef, useState } from 'react';
import { useSetUserAccountField } from '@/hooks/queries/users';
import type { UserAccountField, UserView } from '@/types/api';

interface Props {
    user: UserView;
    onClose: () => void;
}

const FIELD_OPTIONS: { value: UserAccountField; label: string }[] = [
    { value: 'username', label: '用户名' },
    { value: 'phone', label: '手机号' },
];

const CURRENT_VALUE: Record<UserAccountField, (user: UserView) => string> = {
    username: (user) => user.username,
    phone: (user) => user.phone ?? '',
};

/** 管理员每次只设置一个账号标识；唯一性由后端校验并由数据库约束兜底。 */
export function SetUserAccountFieldModal({ user, onClose }: Props) {
    const api = useRef<FormApi<{ field: UserAccountField; value: string }> | null>(null);
    const [field, setField] = useState<UserAccountField>('username');
    const save = useSetUserAccountField();

    const submit = async () => {
        const values = await api.current?.validate();
        if (!values) return;
        await save.mutateAsync({ id: user.id, body: { field, value: values.value.trim() } });
        Toast.success(`${FIELD_OPTIONS.find((option) => option.value === field)?.label}已更新`);
        onClose();
    };

    const rules =
        field === 'username'
            ? [
                  { required: true, message: '请输入用户名' },
                  { min: 2, max: 32, message: '用户名长度需为 2–32 位' },
                  { pattern: /^[a-z0-9_]+$/, message: '用户名只能包含小写英文字母、数字和下划线' },
              ]
              : [
                    { max: 20, message: '手机号长度不能超过 20 位' },
                ];

    return (
        <Modal
            visible
            title={`设置账号信息：${user.username}`}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<{ field: UserAccountField; value: string }>
                key={field}
                initValues={{ field, value: CURRENT_VALUE[field](user) }}
                getFormApi={(formApi) => {
                    api.current = formApi;
                }}
            >
                <Form.RadioGroup
                    field="field"
                    label="设置类型"
                    options={FIELD_OPTIONS}
                    onChange={(event) => {
                        const value: unknown = event.target.value;
                        if (value === 'username' || value === 'phone') setField(value);
                    }}
                />
                <Form.Input
                    field="value"
                    label={FIELD_OPTIONS.find((option) => option.value === field)?.label}
                    placeholder={`请输入${FIELD_OPTIONS.find((option) => option.value === field)?.label}`}
                    maxLength={field === 'username' ? 32 : 20}
                    extraText={field === 'username' ? undefined : '留空可清除当前值'}
                    rules={rules}
                />
            </Form>
        </Modal>
    );
}
