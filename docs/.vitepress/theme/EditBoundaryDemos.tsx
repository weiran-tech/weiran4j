import React, { useState } from 'react';
import { Button, Checkbox, Input, Space } from '@douyinfe/semi-ui';
import { EditConflictFeedback } from '../../../packages/manage/src/components/EditConflictFeedback';
import { AuthAttemptFeedback } from '../../../packages/manage/src/components/AuthAttemptFeedback';
import { useEditConflict } from '../../../packages/manage/src/hooks/useEditConflict';

export function EditBoundaryDemo() {
    const [draft, setDraft] = useState('待保存的昵称');
    const [version, setVersion] = useState(1);
    const [remoteVersion, setRemoteVersion] = useState(1);
    const [loading, setLoading] = useState(false);
    const [failReload, setFailReload] = useState(false);
    const [allowed, setAllowed] = useState(true);
    const [message, setMessage] = useState('');
    const conflict = useEditConflict();
    const reload = () => conflict.reload(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (failReload) throw new Error('本地模拟加载失败');
        setDraft('服务器最新昵称'); setVersion(remoteVersion); setMessage('已重载，可继续编辑');
    });
    const save = async () => {
        setLoading(true); setMessage('');
        try {
            await conflict.run(async () => {
                await new Promise((resolve) => setTimeout(resolve, 500));
                if (version !== remoteVersion) throw { code: 100007 };
                setVersion(version + 1); setRemoteVersion(version + 1); setMessage('已保存');
            });
        } catch { /* 实际共用冲突反馈承载错误。 */ }
        finally { setLoading(false); }
    };
    return <Space vertical align="start" style={{ width: '100%' }}>
        <p>输入与草稿版本一起保留；模拟其他人保存后，本次提交会冲突。后台版本更新不会替换输入。</p>
        <Checkbox checked={allowed} onChange={(event) => setAllowed(!!event.target.checked)}>拥有编辑权限</Checkbox>
        <Checkbox checked={failReload} onChange={(event) => setFailReload(!!event.target.checked)}>模拟重载失败</Checkbox>
        <Input aria-label="冲突演示昵称" value={draft} onChange={setDraft} disabled={loading || !allowed} />
        <p>草稿版本 {version}；服务器版本 {remoteVersion}</p>
        <Space><Button onClick={() => setRemoteVersion((v) => v + 1)}>模拟其他人保存</Button>
            <Button onClick={() => void save()} loading={loading} disabled={loading || !allowed || conflict.conflict || conflict.reloading}>保存草稿</Button></Space>
        <EditConflictFeedback {...conflict} onReload={reload} />
        <span role="status">{message}</span>
    </Space>;
}

export function PasswordAttemptDemo() {
    const [pending, setPending] = useState(false);
    const [limited, setLimited] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [hasPassword, setHasPassword] = useState(true);
    const [password, setPassword] = useState('');
    const submit = async () => {
        setPending(true); setMessage(null);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setPending(false); setMessage(limited ? '请求过于频繁，请稍后重试' : '校验成功，会话仍有效');
    };
    return <Space vertical align="start">
        <p>本地模拟锁屏。超限保留会话，不自动重发；解除限流后点击按钮重试。</p>
        <Checkbox checked={limited} onChange={(event) => setLimited(!!event.target.checked)}>模拟额度耗尽</Checkbox>
        <Checkbox checked={hasPassword} onChange={(event) => setHasPassword(!!event.target.checked)}>已设置本地密码</Checkbox>
        <Input mode="password" aria-label="演示密码" value={password} onChange={setPassword} disabled={!hasPassword || pending} />
        <Button onClick={() => void submit()} loading={pending} disabled={!hasPassword || pending || !password}>手动校验</Button>
        <AuthAttemptFeedback message={message} />
    </Space>;
}
