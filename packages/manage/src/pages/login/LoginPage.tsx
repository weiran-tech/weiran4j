import { Banner, Button, Divider, Form, Typography } from '@douyinfe/semi-ui';
import { KeyRound, LogIn, Phone, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { config } from '@/config';
import { ssoAuthorizeUrl, ssoErrorMessage, useProviders } from '@/hooks/queries/identities';
import { usePhoneLogin, useSendPhoneLoginCode } from '@/hooks/queries/auth';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { safeRedirect } from '@/utils/redirect';
import { ApiError } from '@/utils/request';
import './LoginPage.css';

interface LoginForm {
    username: string;
    password: string;
    phone: string;
    code: string;
}

type LoginMethod = 'password' | 'phone';

const FEATURES = ['JWT 认证', '菜单驱动路由', '按钮级权限', '用户与角色', '字典与系统配置', '登录与操作日志'];

/** 左侧品牌栏：主色底 + 光晕 / 同心环装饰，窄屏不渲染 */
function BrandPanel() {
    return (
        <aside className="login-left">
            <div className="login-glow-top" />
            <div className="login-glow-bottom" />
            <div className="login-ring" />
            <div className="login-brand">
                <div className="login-logo-wrap">
                    <AppLogo size={40} variant="glass" />
                    <span className="login-brand-name">{config.appTitle}</span>
                </div>
                <div className="login-eyebrow">Admin Framework</div>
                <h2 className="login-headline">
                    开箱即用的
                    <br />
                    <span className="login-headline-highlight">后台管理底座</span>
                </h2>
                <p className="login-desc">登录鉴权、用户与权限、字典与配置、审计日志都已就绪，业务模块从这里长出来。</p>
                <div className="login-divider" />
                <div className="login-feature-tags">
                    {FEATURES.map((f) => (
                        <span key={f} className="login-feature-tag">
                            {f}
                        </span>
                    ))}
                </div>
            </div>
        </aside>
    );
}

export default function LoginPage() {
    const { login, verifyMfa } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();
    const [submitting, setSubmitting] = useState(false);
    const [method, setMethod] = useState<LoginMethod>('password');
    const [phone, setPhone] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [notice, setNotice] = useState<string | null>(null);
    const [mfaPending, setMfaPending] = useState(() => searchParams.get('mfa') === '1');
    const [mfaPhone, setMfaPhone] = useState<string | null>(null);
    const sendCode = useSendPhoneLoginCode();
    const phoneLogin = usePhoneLogin();
    // 外部登录回调失败时后端 302 到 /login?ssoError=<code>：首屏就显示提示
    const [error, setError] = useState<string | null>(() => {
        const code = searchParams.get('ssoError');
        return code ? ssoErrorMessage(code) : null;
    });
    // 接口失败（含旧后端没有该接口）按「无提供方、密码登录开启」降级，与接入前的登录页一致
    const { data: providersView } = useProviders();
    const providers = providersView?.providers ?? [];
    const passwordLoginEnabled = providersView?.passwordLoginEnabled ?? true;
    const phoneLoginEnabled = providersView?.phoneLoginEnabled ?? false;
    /** 密码登录关闭时，密码表单收在「管理员应急登录」后面（内置超管仍可用密码登录） */
    const [emergencyOpen, setEmergencyOpen] = useState(false);
    const showPasswordForm = passwordLoginEnabled || emergencyOpen;
    const activeMethod = phoneLoginEnabled && !passwordLoginEnabled ? 'phone' : method;
    const redirectTo = safeRedirect(searchParams.get('redirect'));

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [countdown]);

    // 提示已读进 state，把 ssoError 从地址栏清掉（刷新不再重复提示），保留 redirect 等其它参数
    useEffect(() => {
        if (!searchParams.has('ssoError')) return;
        const next = new URLSearchParams(searchParams);
        next.delete('ssoError');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleSubmit = async (values: LoginForm) => {
        setSubmitting(true);
        setError(null);
        setNotice(null);
        try {
            if (activeMethod === 'phone') {
                await phoneLogin.mutateAsync({ phone: values.phone.trim(), code: values.code.trim() });
            } else {
                const result = await login({ username: values.username.trim(), password: values.password });
                if (result.mfaRequired) {
                    setMfaPhone(result.maskedPhone ?? null);
                    setMfaPending(true);
                    return;
                }
            }
            void navigate(redirectTo, { replace: true });
        } catch (e) {
            setError(e instanceof ApiError ? e.message : '登录失败，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMfaSubmit = async ({ code }: { code: string }) => {
        setSubmitting(true);
        setError(null);
        try {
            await verifyMfa(code.trim());
            void navigate(redirectTo, { replace: true });
        } catch (e) {
            setError(e instanceof ApiError ? e.message : '验证失败，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendCode = async () => {
        const normalizedPhone = phone.trim();
        if (!/^1[3-9]\d{9}$/.test(normalizedPhone)) {
            setError('请输入正确的手机号');
            setNotice(null);
            return;
        }
        setError(null);
        setNotice(null);
        try {
            await sendCode.mutateAsync({ phone: normalizedPhone });
            setCountdown(60);
            setNotice('验证码已发送，请查收短信');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : '验证码发送失败，请稍后重试');
        }
    };

    return (
        <div className="login-page">
            {!isMobile && <BrandPanel />}
            <main className="login-right">
                <div className="login-form-wrapper">
                    {isMobile && (
                        <div className="login-mobile-brand">
                            <AppLogo size={40} />
                            <span className="login-brand-name">{config.appTitle}</span>
                        </div>
                    )}
                    <div className="login-form-header">
                        <Typography.Title heading={3} className="login-form-title">
                            欢迎登录
                        </Typography.Title>
                        <Typography.Text type="tertiary" className="login-form-subtitle">
                            {providers.length || phoneLoginEnabled ? '选择登录方式进入管理后台' : '使用账号密码进入管理后台'}
                        </Typography.Text>
                    </div>
                    {error && <Banner type="danger" description={error} closeIcon={null} className="login-error" />}
                    {notice && <Banner type="success" description={notice} closeIcon={null} className="login-error" />}
                    {mfaPending ? (
                        <Form<{ code: string }> onSubmit={(values) => void handleMfaSubmit(values)}>
                            <p>请输入发送到{mfaPhone ? ` ${mfaPhone}` : '安全手机号'}的 6 位验证码。</p>
                            <Form.Input field="code" noLabel placeholder="手机验证码" autoComplete="one-time-code" size="large" rules={[{ required: true, message: '请输入验证码' }, { pattern: /^\d{6}$/, message: '请输入 6 位验证码' }]} />
                            <Button htmlType="submit" type="primary" theme="solid" block size="large" loading={submitting}>验证并登录</Button>
                            <Button theme="borderless" block onClick={() => { setMfaPending(false); setMfaPhone(null); }}>重新登录</Button>
                        </Form>
                    ) : <>
                    {providers.length > 0 && (
                        <div className="login-sso">
                            {providers.map((p) => (
                                <Button
                                    key={p.id}
                                    block
                                    size="large"
                                    icon={<LogIn size={16} />}
                                    className="login-sso-button"
                                    onClick={() => window.location.assign(ssoAuthorizeUrl(p.id, { redirect: redirectTo, mode: 'login' }))}
                                >
                                    使用 {p.name} 登录
                                </Button>
                            ))}
                        </div>
                    )}
                    {phoneLoginEnabled && passwordLoginEnabled && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <Button block theme={activeMethod === 'password' ? 'solid' : 'light'} type={activeMethod === 'password' ? 'primary' : 'tertiary'} onClick={() => setMethod('password')}>
                                账号密码登录
                            </Button>
                            <Button block theme={activeMethod === 'phone' ? 'solid' : 'light'} type={activeMethod === 'phone' ? 'primary' : 'tertiary'} onClick={() => setMethod('phone')}>
                                手机验证码登录
                            </Button>
                        </div>
                    )}
                    {providers.length > 0 && (showPasswordForm || (activeMethod === 'phone' && phoneLoginEnabled)) && (activeMethod === 'phone' && phoneLoginEnabled ? <Divider className="login-sso-divider">或使用手机号验证码</Divider> : <Divider className="login-sso-divider">或使用账号密码</Divider>)}
                    {!showPasswordForm && (
                        <Button theme="borderless" type="tertiary" block className="login-emergency" onClick={() => { setEmergencyOpen(true); setMethod('password'); }}>
                            管理员应急登录
                        </Button>
                    )}
                    {(showPasswordForm || (activeMethod === 'phone' && phoneLoginEnabled)) && (activeMethod === 'phone' && phoneLoginEnabled ? (
                        <Form<LoginForm> initValues={{ username: '', password: '', phone, code: '' }} onSubmit={(v) => void handleSubmit(v)}>
                            <Form.Input
                                field="phone"
                                noLabel
                                prefix={<Phone size={16} />}
                                placeholder="请输入手机号"
                                rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }]}
                                autoComplete="tel"
                                size="large"
                                onChange={(value) => setPhone(String(value ?? ''))}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Form.Input
                                    field="code"
                                    noLabel
                                    placeholder="请输入短信验证码"
                                    rules={[{ required: true, message: '请输入短信验证码' }, { pattern: /^[0-9]{6}$/, message: '请输入 6 位短信验证码' }]}
                                    autoComplete="one-time-code"
                                    size="large"
                                    style={{ flex: 1 }}
                                />
                                <Button htmlType="button" style={{ minWidth: 128, height: 40 }} disabled={countdown > 0 || sendCode.isPending} loading={sendCode.isPending} onClick={() => void handleSendCode()}>
                                    {countdown > 0 ? `${countdown} 秒后重发` : '发送验证码'}
                                </Button>
                            </div>
                            <Button htmlType="submit" type="primary" theme="solid" block size="large" loading={submitting} className="login-submit">
                                登录
                            </Button>
                        </Form>
                    ) : (
                        <Form<LoginForm> onSubmit={(v) => void handleSubmit(v)}>
                            <Form.Input
                                field="username"
                                noLabel
                                prefix={<UserRound size={16} />}
                                placeholder="请输入用户名"
                                rules={[{ required: true, message: '请输入用户名' }]}
                                autoComplete="username"
                                size="large"
                            />
                            <Form.Input
                                field="password"
                                noLabel
                                mode="password"
                                prefix={<KeyRound size={16} />}
                                placeholder="请输入密码"
                                rules={[{ required: true, message: '请输入密码' }]}
                                autoComplete="current-password"
                                size="large"
                            />
                            <Button htmlType="submit" type="primary" theme="solid" block size="large" loading={submitting} className="login-submit">
                                登录
                            </Button>
                        </Form>
                    ))}
                    </>}
                </div>
            </main>
        </div>
    );
}
