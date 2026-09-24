import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Form, Button, Banner, Radio } from '@douyinfe/semi-ui';
import { login } from '../lib/auth';
import type { Guard } from '../lib/auth';
import { ApiError, NetworkError } from '../lib/api';

interface LoginFormValues {
    passport: string;
    password: string;
    guard: Guard;
}

/**
 * 登录页。
 *
 * 通行证一个输入框收下用户名 / 手机号 / 邮箱三种形态——类型由后端
 * `PassportType.detect` 嗅探。前端不做类型判断，否则同一个字符串会在两处被判成不同类型。
 */
export function LoginPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function onSubmit(values: LoginFormValues) {
        setError('');
        setSubmitting(true);
        try {
            await login(values.passport, values.password, values.guard);
            // 登录会改变「我是谁」，缓存里的旧身份必须失效，否则会短暂显示上一个人的菜单
            await queryClient.invalidateQueries({ queryKey: ['auth'] });
            void navigate('/', { replace: true });
        } catch (cause) {
            if (cause instanceof ApiError || cause instanceof NetworkError) {
                setError(cause.message);
            } else {
                setError('登录失败，请稍后重试');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--semi-color-bg-0)',
            }}
        >
            <Card style={{ width: 360 }} title="weiran4j 登录" headerLine={false}>
                {error && <Banner type="danger" description={error} style={{ marginBottom: 16 }} closeIcon={null} />}
                <Form<LoginFormValues>
                    onSubmit={(values) => void onSubmit(values)}
                    initValues={{ passport: '', password: '', guard: 'backend' }}
                >
                    <Form.Input
                        field="passport"
                        label="通行证"
                        placeholder="用户名 / 手机号 / 邮箱"
                        autoComplete="username"
                        rules={[{ required: true, message: '请输入通行证' }]}
                    />
                    <Form.Input
                        field="password"
                        label="密码"
                        mode="password"
                        autoComplete="current-password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    />
                    <Form.RadioGroup field="guard" label="登录空间" type="button">
                        <Radio value="backend">后台</Radio>
                        <Radio value="user">前台</Radio>
                    </Form.RadioGroup>
                    <Button theme="solid" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
                        {submitting ? '登录中…' : '登录'}
                    </Button>
                </Form>
            </Card>
        </div>
    );
}
