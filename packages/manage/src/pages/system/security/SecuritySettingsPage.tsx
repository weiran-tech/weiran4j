import { Button, Checkbox, InputNumber, SideSheet, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { useSecuritySettings, useUpdateMfaSettings, useUpdatePasswordRules } from '@/hooks/queries/security';
import type { PasswordRulesUpdateRequest } from '@/types/api';
import './SecuritySettingsPage.css';

type Panel = 'password' | 'mfa' | null;

const CHARACTER_TYPES = [
    ['requireLower', '小写字母'],
    ['requireUpper', '大写字母'],
    ['requireDigit', '数字'],
    ['requireSymbol', '符号'],
] as const;

function SettingsLine({ label, value }: { label: string; value: string }) {
    return <div className="security-settings__line"><span>{label}</span><strong>{value}</strong></div>;
}

export default function SecuritySettingsPage() {
    const { data, isLoading } = useSecuritySettings();
    const savePassword = useUpdatePasswordRules();
    const saveMfa = useUpdateMfaSettings();
    const [panel, setPanel] = useState<Panel>(null);
    const [password, setPassword] = useState<PasswordRulesUpdateRequest>({
        minLength: 8, maxLength: 64, requireLower: true, requireUpper: false, requireDigit: true, requireSymbol: false,
    });
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [rememberDays, setRememberDays] = useState(7);

    const submit = async () => {
        if (panel === 'password') {
            if (password.minLength > password.maxLength) {
                Toast.error('最小长度不能大于最大长度');
                return;
            }
            if (!CHARACTER_TYPES.some(([key]) => password[key])) {
                Toast.error('至少选择一种字符类型');
                return;
            }
            await savePassword.mutateAsync(password);
        } else if (panel === 'mfa') {
            await saveMfa.mutateAsync({ enabled: mfaEnabled, rememberDays });
        }
        Toast.success('安全设置已保存');
        setPanel(null);
    };

    if (isLoading || !data) return <PageContainer title="安全设置"><span>加载中…</span></PageContainer>;

    const openPassword = () => {
        setPassword({
            minLength: data.passwordMinLength,
            maxLength: data.passwordMaxLength,
            requireLower: data.requireLower,
            requireUpper: data.requireUpper,
            requireDigit: data.requireDigit,
            requireSymbol: data.requireSymbol,
        });
        setPanel('password');
    };
    const openMfa = () => {
        setMfaEnabled(data.mfaEnabled);
        setRememberDays(data.mfaRememberDays);
        setPanel('mfa');
    };

    const types = CHARACTER_TYPES.filter(([key]) => data[key]).map(([, label]) => label).join('、') || '未设置';
    return <>
        <PageContainer title="安全设置">
            <div className="security-settings">
                <section className="security-settings__section">
                    <header><h3>密码策略</h3><Permission code="system:security:update"><Button theme="borderless" type="primary" onClick={openPassword}>修改</Button></Permission></header>
                    <SettingsLine label="密码长度" value={`${data.passwordMinLength}–${data.passwordMaxLength} 个字符`} />
                    <SettingsLine label="密码要包含的字符类型" value={types} />
                </section>
                <section className="security-settings__section">
                    <header><h3>多因素认证</h3><Permission code="system:security:update"><Button theme="borderless" type="primary" onClick={openMfa}>修改</Button></Permission></header>
                    <SettingsLine label="手机多因素认证" value={data.mfaEnabled ? '已启用' : '未启用'} />
                    <SettingsLine label="认证设备" value="安全手机号" />
                    <SettingsLine label="记住验证状态" value={data.mfaRememberDays === 0 ? '每次登录均验证' : `${data.mfaRememberDays} 天`} />
                    <p className="security-settings__note">启用后，已绑定手机号的用户登录时需完成短信验证；未绑定手机号的账号暂时免验。</p>
                </section>
            </div>
        </PageContainer>

        <SideSheet visible={panel !== null} title={panel === 'password' ? '修改密码策略' : '修改多因素认证'} width={560} onCancel={() => setPanel(null)} footer={<div className="security-settings__footer"><Button onClick={() => setPanel(null)}>取消</Button><Button type="primary" theme="solid" loading={savePassword.isPending || saveMfa.isPending} onClick={() => void submit().catch(() => undefined)}>保存</Button></div>}>
            {panel === 'password' && <div className="security-settings__form">
                <label>密码长度</label>
                <div className="security-settings__length">
                    <InputNumber aria-label="密码最小长度" min={8} max={64} value={password.minLength} onChange={(value) => setPassword((old) => ({ ...old, minLength: Number(value) }))} />
                    <span>至</span>
                    <InputNumber aria-label="密码最大长度" min={8} max={64} value={password.maxLength} onChange={(value) => setPassword((old) => ({ ...old, maxLength: Number(value) }))} />
                </div>
                <label>密码要包含的字符类型</label>
                <div className="security-settings__checks">{CHARACTER_TYPES.map(([key, label]) => <Checkbox key={key} checked={password[key]} onChange={(event) => setPassword((old) => ({ ...old, [key]: event.target.checked }))}>{label}</Checkbox>)}</div>
            </div>}
            {panel === 'mfa' && <div className="security-settings__form">
                <label>手机多因素认证</label>
                <Checkbox checked={mfaEnabled} onChange={(event) => setMfaEnabled(event.target.checked ?? false)}>启用</Checkbox>
                <p>登录时向已绑定的安全手机号发送验证码，验证通过后才建立会话。</p>
                <label>认证设备</label>
                <div>安全手机号（当前唯一支持的设备）</div>
                <label>验证有效期</label>
                <div className="security-settings__length"><InputNumber aria-label="验证有效期天数" min={0} max={30} value={rememberDays} onChange={(value) => setRememberDays(Number(value))} /><span>天</span></div>
                <p>0 天表示每次登录都验证；大于 0 时，同一浏览器在有效期内再次登录免验。</p>
                <p>未绑定手机号的账号暂时免验。启用前请确认短信发送器和验证码模板可用。</p>
            </div>}
        </SideSheet>
    </>;
}
