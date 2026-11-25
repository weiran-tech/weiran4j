import { Button, Form, Input, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ExternalAccountsCard } from '@/components/ExternalAccountsCard';
import { PageContainer } from '@/components/PageContainer';
import { TextAvatar } from '@/components/TextAvatar';
import { useBindPhone, useChangePassword, useSendBindPhoneCode, useUpdateOwnUsername, useUpdateProfile } from '@/hooks/queries/auth';
import { useDictOptions } from '@/hooks/queries/dicts';
import { useAuth } from '@/hooks/useAuth';
import type { Gender, UserAvatar } from '@/types/api';
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '@/utils/password';
import './ProfilePage.css';

type Dialog = 'avatar' | 'username' | 'profile' | 'phone' | 'password' | null;

interface ProfileForm {
    nickname: string;
    gender?: Gender;
}

interface PasswordForm {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface SettingsRowProps {
    title: string;
    description: string;
    value: ReactNode;
    onAction?: (() => void) | undefined;
}

const AVATAR_COLORS = ['#0064FA', '#00A870', '#F5A623', '#E76B6B', '#8B5CF6', '#334155'];

function SettingsRow({ title, description, value, onAction }: SettingsRowProps) {
    return (
        <div className="profile-setting-row">
            <div className="profile-setting-row__name">{title}</div>
            <div className="profile-setting-row__description">{description}</div>
            <div className="profile-setting-row__value">{value}</div>
            <div className="profile-setting-row__action">
                {onAction && <Button theme="borderless" type="primary" aria-label={`修改${title}`} onClick={onAction}>修改</Button>}
            </div>
        </div>
    );
}

function maskedPhone(phone: string | null) {
    return phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '未设置';
}

export default function ProfilePage() {
    const { user, clearSession } = useAuth();
    const updateProfile = useUpdateProfile();
    const updateOwnUsername = useUpdateOwnUsername();
    const changePassword = useChangePassword();
    const sendBindCode = useSendBindPhoneCode();
    const bindPhone = useBindPhone();
    const genderOptions = useDictOptions('sys_user_gender');
    const [dialog, setDialog] = useState<Dialog>(null);
    const [avatarText, setAvatarText] = useState('');
    const [avatarBackground, setAvatarBackground] = useState('#0064FA');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const profileApi = useRef<FormApi<ProfileForm> | null>(null);
    const passwordApi = useRef<FormApi<PasswordForm> | null>(null);

    if (!user) return null;

    const closeDialog = () => setDialog(null);
    const openAvatar = () => {
        setAvatarText(user.avatar?.text ?? Array.from(user.nickname)[0] ?? '');
        setAvatarBackground(user.avatar?.background ?? '#0064FA');
        setDialog('avatar');
    };
    const openPhone = () => {
        setPhone('');
        setCode('');
        setCodeSent(false);
        setDialog('phone');
    };
    const openUsername = () => {
        setUsername(user.username);
        setDialog('username');
    };
    const saveUsername = async () => {
        const value = username.trim();
        if (value.length < 2 || value.length > 32 || !/^[a-z0-9_]+$/.test(value)) {
            Toast.error('用户名需为 2–32 位，只能包含小写英文字母、数字和下划线');
            return;
        }
        await updateOwnUsername.mutateAsync({ username: value });
        Toast.success('用户名已修改');
        closeDialog();
    };
    const saveProfile = async (nickname: string, gender: Gender | null, avatar: UserAvatar | null, message: string) => {
        await updateProfile.mutateAsync({ nickname, gender, avatar });
        Toast.success(message);
        closeDialog();
    };
    const saveAvatar = async () => {
        const text = avatarText.trim();
        if (!text || Array.from(text).length > 4) {
            Toast.error('头像文字需为 1–4 个字符');
            return;
        }
        await saveProfile(user.nickname, user.gender, { text, background: avatarBackground }, '头像已更新');
    };
    const savePersonalInfo = async () => {
        const values = await profileApi.current?.validate();
        if (!values) return;
        await saveProfile(values.nickname.trim(), values.gender ?? null, user.avatar, '个人信息已保存');
    };
    const sendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
            Toast.error('请输入正确的手机号');
            return;
        }
        await sendBindCode.mutateAsync(phone.trim());
        setCodeSent(true);
        Toast.success('验证码已发送');
    };
    const confirmPhone = async () => {
        if (!/^\d{6}$/.test(code.trim())) {
            Toast.error('请输入 6 位验证码');
            return;
        }
        await bindPhone.mutateAsync({ phone: phone.trim(), code: code.trim() });
        Toast.success('手机号已设置');
        closeDialog();
    };
    const submitPassword = async () => {
        const values = await passwordApi.current?.validate();
        if (!values) return;
        await changePassword.mutateAsync({ oldPassword: values.oldPassword, newPassword: values.newPassword });
        Toast.success('密码已修改，请重新登录');
        closeDialog();
        clearSession();
    };

    return (
        <>
            <PageContainer title="个人信息">
                <div className="profile-settings">
                    <SettingsRow title="头像" description="选择文字与背景色作为头像" value={<button type="button" className="profile-avatar-trigger" aria-label="设置头像" onClick={openAvatar}><TextAvatar avatar={user.avatar} fallback={user.nickname} size="extra-small" /></button>} onAction={openAvatar} />
                    <SettingsRow title="用户名" description="登录时使用的账号名称" value={user.username} onAction={openUsername} />
                    <SettingsRow title="昵称" description="用于页面中的个人展示" value={user.nickname} onAction={() => setDialog('profile')} />
                    <SettingsRow title="性别" description="个人资料中的性别" value={genderOptions.find((item) => item.value === user.gender)?.label ?? '未设置'} onAction={() => setDialog('profile')} />
                </div>
            </PageContainer>

            <PageContainer title="基本设置">
                <div className="profile-settings">
                    <SettingsRow title="登录密码" description="登录账号时需要输入的密码" value={user.hasPassword === false ? '未设置' : '已设置'} onAction={user.hasPassword === false ? undefined : () => setDialog('password')} />
                    <SettingsRow title="安全手机号" description="用于接收验证码、验证身份；设置后可使用手机验证码登录" value={maskedPhone(user.phone)} onAction={openPhone} />
                </div>
            </PageContainer>

            <ExternalAccountsCard />

            <Modal visible={dialog === 'avatar'} title="设置头像" onCancel={closeDialog} onOk={() => void saveAvatar().catch(() => undefined)} okButtonProps={{ loading: updateProfile.isPending }} maskClosable={false}>
                <div className="profile-avatar-editor">
                    <TextAvatar avatar={{ text: avatarText.trim() || Array.from(user.nickname)[0] || '?', background: avatarBackground }} fallback={user.nickname} size="large" />
                    <p className="profile-avatar-editor__hint">预览头像</p>
                    <label className="profile-avatar-editor__label" htmlFor="profile-avatar-text">头像文字</label>
                    <Input id="profile-avatar-text" value={avatarText} onChange={setAvatarText} maxLength={8} placeholder="1–4 个字符" />
                    <span className="profile-avatar-editor__label">背景颜色</span>
                    <div className="profile-avatar-editor__colors">
                        {AVATAR_COLORS.map((color) => (
                            <button key={color} type="button" className={`profile-avatar-editor__swatch${color === avatarBackground ? ' profile-avatar-editor__swatch--selected' : ''}`} style={{ backgroundColor: color }} aria-label={`选择背景色 ${color}`} aria-pressed={color === avatarBackground} onClick={() => setAvatarBackground(color)} />
                        ))}
                        <label className="profile-avatar-editor__custom" title="自定义背景色">
                            <span>自定义</span>
                            <input type="color" aria-label="自定义背景色" value={avatarBackground} onChange={(event) => setAvatarBackground(event.target.value)} />
                        </label>
                    </div>
                    <Button theme="borderless" onClick={() => void saveProfile(user.nickname, user.gender, null, '已恢复默认头像').catch(() => undefined)}>恢复默认头像</Button>
                </div>
            </Modal>

            <Modal visible={dialog === 'username'} title="修改用户名" onCancel={closeDialog} onOk={() => void saveUsername().catch(() => undefined)} okButtonProps={{ loading: updateOwnUsername.isPending }} maskClosable={false}>
                <label htmlFor="profile-username">新用户名</label>
                <Input id="profile-username" value={username} onChange={setUsername} maxLength={32} placeholder="2–32 位，小写字母、数字或下划线" />
                <p>仅支持小写英文字母、数字和下划线</p>
            </Modal>

            <Modal visible={dialog === 'profile'} title="修改个人信息" onCancel={closeDialog} onOk={() => void savePersonalInfo().catch(() => undefined)} okButtonProps={{ loading: updateProfile.isPending }} maskClosable={false}>
                {dialog === 'profile' && <Form<ProfileForm> initValues={{ nickname: user.nickname, ...(user.gender ? { gender: user.gender } : {}) }} getFormApi={(api) => { profileApi.current = api; }} labelPosition="left" labelWidth={72}>
                    <Form.Input field="nickname" label="昵称" maxLength={32} rules={[{ required: true, message: '请输入昵称' }]} />
                    <Form.Select field="gender" label="性别" optionList={genderOptions} showClear style={{ width: '100%' }} />
                </Form>}
            </Modal>

            <Modal visible={dialog === 'phone'} title="设置安全手机号" onCancel={closeDialog} onOk={() => void confirmPhone().catch(() => undefined)} okText="验证并设置" okButtonProps={{ disabled: !codeSent, loading: bindPhone.isPending }} maskClosable={false}>
                <div className="profile-phone-editor">
                    <p>当前手机号：{maskedPhone(user.phone)}</p>
                    <Input aria-label="新手机号" value={phone} onChange={(value) => { setPhone(value); setCodeSent(false); setCode(''); }} placeholder="请输入新手机号" maxLength={11} />
                    <Button onClick={() => void sendCode().catch(() => undefined)} loading={sendBindCode.isPending}>发送验证码</Button>
                    {codeSent && <Input aria-label="短信验证码" value={code} onChange={setCode} placeholder="请输入短信验证码" maxLength={6} />}
                </div>
            </Modal>

            <Modal visible={dialog === 'password'} title="修改登录密码" onCancel={closeDialog} onOk={() => void submitPassword().catch(() => undefined)} okText="确认修改" okButtonProps={{ loading: changePassword.isPending }} maskClosable={false}>
                {dialog === 'password' && <Form<PasswordForm> getFormApi={(api) => { passwordApi.current = api; }} labelPosition="left" labelWidth={90}>
                    <Form.Input field="oldPassword" label="原密码" mode="password" rules={[{ required: true, message: '请输入原密码' }]} />
                    <Form.Input field="newPassword" label="新密码" mode="password" extraText="8–64 位，须同时包含字母与数字" rules={[{ required: true, message: '请输入新密码' }, { pattern: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE }]} />
                    <Form.Input field="confirmPassword" label="确认新密码" mode="password" rules={[{ required: true, message: '请再次输入新密码' }, { validator: (_r: unknown, value: unknown) => value === passwordApi.current?.getValue('newPassword'), message: '两次输入的密码不一致' }]} />
                </Form>}
            </Modal>
        </>
    );
}
