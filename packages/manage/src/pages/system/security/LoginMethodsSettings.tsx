/** @jsxRuntime automatic */
import { useState, type ReactNode } from 'react';
import { Button, Checkbox, SideSheet, Toast } from '@douyinfe/semi-ui';
import { QueryReadiness, queriesReady } from '@/components/QueryReadiness';
import { PHONE_LOGIN_CONFIG_KEY, useConfigAll, useSaveConfig } from '@/hooks/queries/configs';
import { usePermission } from '@/hooks/usePermission';
import { useDraftCloseGuard } from '@/hooks/useFormCloseGuard';

export function LoginMethodsSummary({ enabled, action, children }: { enabled?: boolean | undefined; action?: ReactNode; children?: ReactNode }) {
    return <section className="security-settings__section">
        <header><h3>登录方式</h3>{action}</header>
        {children}
        {enabled !== undefined && <div className="security-settings__line"><span>手机号＋短信验证码登录</span><strong>{enabled ? '已启用' : '未启用'}</strong></div>}
        <p className="security-settings__note">启用后，用户可通过已绑定的手机号和短信验证码登录。请先配置可用的短信发送器和验证码模板。</p>
    </section>;
}

export function LoginMethodsFields({ enabled, disabled, onChange }: { enabled: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
    return <div className="security-settings__form">
        <Checkbox checked={enabled} disabled={disabled} onChange={event => onChange(event.target.checked ?? false)}>启用手机号+短信验证码登录</Checkbox>
        <p>启用后，用户可通过已绑定的手机号和短信验证码登录。短信发送器和验证码模板仍在短信配置中维护。</p>
    </div>;
}

export function LoginMethodsSettings() {
    const query = useConfigAll();
    const save = useSaveConfig();
    const { hasPermission } = usePermission();
    const record = query.data?.find(item => item.configKey === PHONE_LOGIN_CONFIG_KEY);
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [initialDraft, setInitialDraft] = useState({ enabled: false });
    const guard = useDraftCloseGuard({ enabled }, initialDraft, () => setOpen(false));
    const ready = queriesReady(query) && record !== undefined && !save.isPending && !guard.saving && hasPermission('system:config:update');
    const submit = async () => {
        if (!ready || !record) return;
        await save.mutateAsync({ id: record.id, body: {
            configKey: record.configKey, configValue: String(enabled), configType: record.configType,
            groupKey: record.groupKey, fieldType: record.fieldType, fieldOptions: record.fieldOptions,
            required: record.required, description: record.description,
        } });
        Toast.success('登录方式已保存');
        setOpen(false);
    };
    const feedback = <>
        <QueryReadiness query={query} label="登录方式" onRetry={() => query.refetch()} />
        {queriesReady(query) && !record && <p role="alert">未找到手机号登录配置，请检查系统配置数据。</p>}
    </>;
    return <>
        <LoginMethodsSummary enabled={record ? record.configValue === 'true' : undefined}
            action={hasPermission('system:config:update') && <Button theme="borderless" type="primary" disabled={!ready} onClick={() => { if (ready && record) { setInitialDraft({ enabled: record.configValue === 'true' }); setEnabled(record.configValue === 'true'); setOpen(true); } }}>修改</Button>}
        >{feedback}</LoginMethodsSummary>
        <SideSheet visible={open} title="修改登录方式" width={560} onCancel={guard.requestClose}
            maskClosable={false} closable={!guard.saving} closeOnEsc={!guard.saving}
            footer={<div className="security-settings__footer"><Button disabled={guard.saving} onClick={guard.requestClose}>取消</Button><Button type="primary" theme="solid" disabled={!ready} loading={save.isPending} onClick={() => void guard.submit(submit).catch(() => undefined)}>保存</Button></div>}>
            {feedback}
            <LoginMethodsFields enabled={enabled} disabled={!ready} onChange={setEnabled} />
        </SideSheet>
    </>;
}
