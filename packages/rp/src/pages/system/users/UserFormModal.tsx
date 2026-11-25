import { Form, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef } from 'react';
import { STATUS_OPTIONS } from '@/components/StatusTag';
import { useDictOptions } from '@/hooks/queries/dicts';
import { useRoleOptions } from '@/hooks/queries/roles';
import { useSaveUser } from '@/hooks/queries/users';
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '@/utils/password';
import type { Gender, Status, UserView } from '@/types/api';

interface UserForm {
    username: string;
    nickname: string;
    password: string;
    phone?: string;
    gender?: Gender;
    status: Status;
    roleIds: number[];
}

function toInitValues(r: UserView | null): UserForm {
    if (!r) return { username: '', nickname: '', password: '', status: 'enabled', roleIds: [], gender: 'unknown' };
    return {
        username: r.username,
        nickname: r.nickname,
        password: '',
        status: r.status,
        roleIds: r.roleIds ?? [],
        ...(r.gender ? { gender: r.gender } : {}),
    };
}

interface Props {
    /** null = 新增 */
    record: UserView | null;
    onClose: () => void;
}

export function UserFormModal({ record, onClose }: Props) {
    const isEdit = record !== null;
    const api = useRef<FormApi<UserForm> | null>(null);
    const save = useSaveUser();
    const genderOptions = useDictOptions('sys_user_gender');
    const { data: roles } = useRoleOptions();

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        const common = {
            nickname: v.nickname,
            gender: v.gender ?? null,
            status: v.status,
            roleIds: v.roleIds ?? [],
        };
        await save.mutateAsync(
            isEdit
                ? { id: record.id, body: common }
                : { body: { ...common, username: v.username.trim(), password: v.password, phone: v.phone || null } },
        );
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑用户' : '新增用户'}
            width={600}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<UserForm>
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={toInitValues(record)}
                labelPosition="left"
                labelWidth={90}
            >
                <Form.Input
                    field="username"
                    label="用户名"
                    disabled={isEdit}
                    maxLength={32}
                    rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 2, max: 32, message: '用户名长度需为 2–32 位' },
                        { pattern: /^[a-z0-9_]+$/, message: '用户名只能包含小写英文字母、数字和下划线' },
                    ]}
                />
                <Form.Input field="nickname" label="昵称" maxLength={32} rules={[{ required: true, message: '请输入昵称' }]} />
                {!isEdit && (
                    <Form.Input
                        field="password"
                        label="初始密码"
                        mode="password"
                        rules={[
                            { required: true, message: '请输入初始密码' },
                            { pattern: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE },
                        ]}
                    />
                )}
                <Form.Select
                    field="roleIds"
                    label="角色"
                    multiple
                    style={{ width: '100%' }}
                    placeholder="选择角色"
                    optionList={(roles ?? []).map((r) => ({ label: r.name, value: r.id }))}
                />
                <Form.Select field="gender" label="性别" optionList={genderOptions} style={{ width: '100%' }} showClear />
                {!isEdit && <Form.Input field="phone" label="手机" maxLength={20} />}
                <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} disabled={record?.isBuiltin ?? false} />
            </Form>
        </Modal>
    );
}
