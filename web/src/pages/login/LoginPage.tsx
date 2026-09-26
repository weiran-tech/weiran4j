import { Banner, Button, Form } from '@douyinfe/semi-ui';
import { KeyRound, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import { safeRedirect } from '@/utils/redirect';
import { ApiError } from '@/utils/request';

interface LoginForm {
    username: string;
    password: string;
}

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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
            <div className="login-card">
                <h1 className="login-card__title">{config.appTitle}</h1>
                {error && <Banner type="danger" description={error} closeIcon={null} style={{ marginBottom: 16 }} />}
                <Form<LoginForm> onSubmit={(v) => void handleSubmit(v)} labelPosition="inset">
                    <Form.Input
                        field="username"
                        label="用户名"
                        prefix={<UserRound size={16} />}
                        placeholder="请输入用户名"
                        rules={[{ required: true, message: '请输入用户名' }]}
                        autoComplete="username"
                        size="large"
                    />
                    <Form.Input
                        field="password"
                        label="密码"
                        mode="password"
                        prefix={<KeyRound size={16} />}
                        placeholder="请输入密码"
                        rules={[{ required: true, message: '请输入密码' }]}
                        autoComplete="current-password"
                        size="large"
                    />
                    <Button htmlType="submit" type="primary" theme="solid" block size="large" loading={submitting} style={{ marginTop: 16 }}>
                        登录
                    </Button>
                </Form>
            </div>
        </div>
    );
}
