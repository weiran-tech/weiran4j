import { Banner, Button, Form, Typography } from '@douyinfe/semi-ui';
import { KeyRound, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { config } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { safeRedirect } from '@/utils/redirect';
import { ApiError } from '@/utils/request';
import './LoginPage.css';

interface LoginForm {
    username: string;
    password: string;
}

const FEATURES = ['JWT 认证', '菜单驱动路由', '按钮级权限', '部门与角色', '字典与系统配置', '登录与操作日志'];

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
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isMobile = useIsMobile();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (values: LoginForm) => {
        setSubmitting(true);
        setError(null);
        try {
            await login({ username: values.username.trim(), password: values.password });
            void navigate(safeRedirect(searchParams.get('redirect')), { replace: true });
        } catch (e) {
            setError(e instanceof ApiError ? e.message : '登录失败，请稍后重试');
        } finally {
            setSubmitting(false);
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
                            使用账号密码进入管理后台
                        </Typography.Text>
                    </div>
                    {error && <Banner type="danger" description={error} closeIcon={null} className="login-error" />}
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
                </div>
            </main>
        </div>
    );
}
