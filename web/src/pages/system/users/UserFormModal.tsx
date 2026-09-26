import { Form, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef } from 'react';
import { useDepartmentTreeData } from '@/components/DepartmentTreeSelect';
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
    email?: string;
    phone?: string;
    gender?: Gender;
    departmentId?: number;
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
        ...(r.email ? { email: r.email } : {}),
        ...(r.phone ? { phone: r.phone } : {}),
        ...(r.gender ? { gender: r.gender } : {}),
        ...(r.departmentId ? { departmentId: r.departmentId } : {}),
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
    const departmentTree = useDepartmentTreeData();
    const { data: roles } = useRoleOptions();

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        const common = {
            nickname: v.nickname,
            email: v.email || null,
            phone: v.phone || null,
            gender: v.gender ?? null,
            departmentId: v.departmentId ?? null,
            status: v.status,
            roleIds: v.roleIds ?? [],
        };
        await save.mutateAsync(
            isEdit
                ? { id: record.id, body: common }
                : { body: { ...common, username: v.username.trim(), password: v.password } },
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
                    rules={[{ required: true, message: '请输入用户名' }]}
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
                <Form.TreeSelect
                    field="departmentId"
                    label="部门"
                    treeData={departmentTree}
                    style={{ width: '100%' }}
                    placeholder="选择部门"
                    showClear
                    filterTreeNode
                    expandAll
                />
                <Form.Select
                    field="roleIds"
                    label="角色"
                    multiple
                    style={{ width: '100%' }}
                    placeholder="选择角色"
                    optionList={(roles ?? []).map((r) => ({ label: r.name, value: r.id }))}
                />
                <Form.Select field="gender" label="性别" optionList={genderOptions} style={{ width: '100%' }} showClear />
                <Form.Input field="email" label="邮箱" maxLength={128} rules={[{ type: 'email', message: '邮箱格式不正确' }]} />
                <Form.Input field="phone" label="手机" maxLength={20} />
                <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} disabled={record?.isBuiltin ?? false} />
            </Form>
        </Modal>
    );
}
