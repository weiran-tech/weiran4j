import { Form, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef } from 'react';
import { useResetUserPassword } from '@/hooks/queries/users';
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '@/utils/password';
import type { UserView } from '@/types/api';

interface Props {
    user: UserView;
    onClose: () => void;
}

/** 管理员重置密码：成功后该用户的旧令牌立即失效（后端 token_version+1） */
export function ResetPasswordModal({ user, onClose }: Props) {
    const api = useRef<FormApi<{ password: string }> | null>(null);
    const reset = useResetUserPassword();

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        await reset.mutateAsync({ id: user.id, password: v.password });
        Toast.success('密码已重置');
        onClose();
    };

    return (
        <Modal
            visible
            title={`重置密码：${user.username}`}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: reset.isPending }}
            maskClosable={false}
        >
            <Form<{ password: string }>
                getFormApi={(a) => {
                    api.current = a;
                }}
            >
                <Form.Input
                    field="password"
                    label="新密码"
                    mode="password"
                    extraText="重置后该用户需要用新密码重新登录"
                    rules={[
                        { required: true, message: '请输入新密码' },
                        { pattern: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE },
                    ]}
                />
            </Form>
        </Modal>
    );
}
