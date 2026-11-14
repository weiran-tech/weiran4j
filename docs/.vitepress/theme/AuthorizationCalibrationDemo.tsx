import React, { useState } from 'react';
import { Button, Checkbox, Input, Space, Spin } from '@douyinfe/semi-ui';
import { AuthorizationFeedback } from '../../../packages/manage/src/components/AuthorizationFeedback';
import { useAuthorizationCalibration } from '../../../packages/manage/src/hooks/useAuthorizationCalibration';
import { notifyPermissionRejected } from '../../../packages/manage/src/utils/authorization-events';
import { Permission } from '../../../packages/manage/src/components/Permission';
import { PermissionContext } from '../../../packages/manage/src/hooks/usePermission';

/** 模拟服务仅在内存中运行，共用业务校准生命周期和反馈组件。 */
export function AuthorizationCalibrationDemo() {
    const [remoteAllowed, setRemoteAllowed] = useState(true);
    const [empty, setEmpty] = useState(false);
    const [fail, setFail] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [snapshot, setSnapshot] = useState({ allowed: true, menus: ['菜单管理'], revision: 1 });
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [draft, setDraft] = useState('未保存的菜单名称');
    const [writes, setWrites] = useState(0);
    const [message, setMessage] = useState('');
    const refresh = async () => {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (fail) { setFailed(true); setLoading(false); return; }
        setSnapshot((old) => ({ allowed: remoteAllowed && !empty, menus: remoteAllowed && !empty ? ['菜单管理'] : [], revision: old.revision + 1 }));
        setFailed(false); setLoading(false);
    };
    useAuthorizationCalibration('docs-authorization', refresh);
    const write = () => {
        setWrites((count) => count + 1);
        if (!remoteAllowed) { setMessage('403：本次保存失败，发起权限校准；不会自动重放保存。'); notifyPermissionRejected('docs-authorization'); }
        else setMessage('保存成功');
    };
    return <Space vertical align="start" style={{ width: '100%' }}>
        <p>模拟另一会话改权。每 30 秒、恢复前台或联网时校准；失败保留上次结果，导航与按钮在读取成功后一起更新。</p>
        <Checkbox checked={remoteAllowed} onChange={(e) => setRemoteAllowed(!!e.target.checked)}>服务器授予编辑权限</Checkbox>
        <Checkbox checked={empty} onChange={(e) => setEmpty(!!e.target.checked)}>服务器返回空菜单</Checkbox>
        <Checkbox checked={fail} onChange={(e) => setFail(!!e.target.checked)}>模拟校准失败</Checkbox>
        <Checkbox checked={disabled} onChange={(e) => setDisabled(!!e.target.checked)}>禁用表单操作</Checkbox>
        <Button onClick={() => void refresh()} loading={loading} disabled={loading}>立即校准</Button>
        <AuthorizationFeedback failed={failed} loading={loading} onRetry={() => void refresh()} />
        {loading && <Spin tip="正在校准，保留现有快照" />}
        <nav aria-label="演示授权导航">{snapshot.menus.length ? snapshot.menus.join('、') : '没有可访问菜单'}</nav>
        <PermissionContext.Provider value={snapshot.allowed ? ['demo:menu:update'] : []}>
            <Input aria-label="授权演示菜单草稿" value={draft} onChange={setDraft} disabled={!snapshot.allowed || disabled} />
            <Permission code="demo:menu:update"><Button onClick={write} disabled={disabled || loading}>保存演示菜单</Button></Permission>
        </PermissionContext.Provider>
        <p role="status">快照版本 {snapshot.revision}；已发起保存 {writes} 次。{message}</p>
    </Space>;
}
