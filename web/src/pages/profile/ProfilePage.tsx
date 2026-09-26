import { Button, Form, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useDictOptions } from '@/hooks/queries/dicts';
import { useChangePassword, useUpdateProfile } from '@/hooks/queries/auth';
import { useAuth } from '@/hooks/useAuth';
import type { Gender } from '@/types/api';
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '@/utils/password';

interface ProfileForm {
    nickname: string;
    email?: string;
    phone?: string;
    avatar?: string;
    gender?: Gender;
}

interface PasswordForm {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export default function ProfilePage() {
    const { user, clearSession } = useAuth();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();
    const genderOptions = useDictOptions('sys_user_gender');
    const pwdApi = useRef<FormApi<PasswordForm> | null>(null);

    if (!user) return null;

    const submitProfile = (v: ProfileForm) => {
        updateProfile.mutate(
            {
                nickname: v.nickname,
                email: v.email || null,
                phone: v.phone || null,
                avatar: v.avatar || null,
                gender: v.gender ?? null,
            },
            { onSuccess: () => Toast.success('资料已保存') },
        );
    };

    const submitPassword = (v: PasswordForm) => {
        changePassword.mutate(
            { oldPassword: v.oldPassword, newPassword: v.newPassword },
            {
                onSuccess: () => {
                    // 后端已让旧令牌失效（token_version+1），本地也清掉，路由守卫会带回登录页
                    Toast.success('密码已修改，请重新登录');
                    clearSession();
                },
            },
        );
    };

    return (
        <>
            <PageContainer title="个人资料">
                <Form<ProfileForm>
                    key={user.id}
                    labelPosition="left"
                    labelWidth={96}
                    style={{ maxWidth: 520 }}
                    initValues={{
                        nickname: user.nickname,
                        ...(user.email ? { email: user.email } : {}),
                        ...(user.phone ? { phone: user.phone } : {}),
                        ...(user.avatar ? { avatar: user.avatar } : {}),
                        ...(user.gender ? { gender: user.gender } : {}),
                    }}
                    onSubmit={submitProfile}
                >
                    <Form.Input field="username" label="用户名" initValue={user.username} disabled />
                    <Form.Input field="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]} maxLength={32} />
                    <Form.Input field="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]} maxLength={128} />
                    <Form.Input field="phone" label="手机" maxLength={20} />
                    <Form.Input field="avatar" label="头像地址" placeholder="https://…" maxLength={256} />
                    <Form.Select field="gender" label="性别" optionList={genderOptions} style={{ width: '100%' }} showClear />
                    <Button htmlType="submit" type="primary" theme="solid" loading={updateProfile.isPending} style={{ marginLeft: 96 }}>
                        保存资料
                    </Button>
                </Form>
            </PageContainer>
            <PageContainer title="修改密码">
                <Form<PasswordForm>
                    labelPosition="left"
                    labelWidth={96}
                    style={{ maxWidth: 520 }}
                    getFormApi={(api) => {
                        pwdApi.current = api;
                    }}
                    onSubmit={submitPassword}
                >
                    <Form.Input field="oldPassword" label="原密码" mode="password" rules={[{ required: true, message: '请输入原密码' }]} />
                    <Form.Input
                        field="newPassword"
                        label="新密码"
                        mode="password"
                        extraText="8–64 位，须同时包含字母与数字"
                        rules={[
                            { required: true, message: '请输入新密码' },
                            { pattern: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE },
                        ]}
                    />
                    <Form.Input
                        field="confirmPassword"
                        label="确认新密码"
                        mode="password"
                        rules={[
                            { required: true, message: '请再次输入新密码' },
                            {
                                validator: (_r: unknown, value: unknown) => value === pwdApi.current?.getValue('newPassword'),
                                message: '两次输入的密码不一致',
                            },
                        ]}
                    />
                    <Button htmlType="submit" type="primary" theme="solid" loading={changePassword.isPending} style={{ marginLeft: 96 }}>
                        修改密码
                    </Button>
                </Form>
            </PageContainer>
        </>
    );
}
