import { Button, Input, Select, SideSheet, Switch, Toast, Typography } from '@douyinfe/semi-ui';
import { useMemo, useState } from 'react';
import { useSaveStaff, useStaffAll } from '@/hooks/queries/im';
import type { StaffSaveRequest, StaffStatus, StaffView } from '@/types/api';

const STATUS_OPTIONS: { label: string; value: StaffStatus }[] = [
    { label: '在线', value: 'online' },
    { label: '挂起', value: 'busy' },
    { label: '离线', value: 'offline' },
];

interface Props {
    /** null = 新增 */
    record: StaffView | null;
    onClose: () => void;
}

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function StaffFormSheet({ record, onClose }: Props) {
    const isEdit = record !== null;
    const save = useSaveStaff();
    const { data: staff } = useStaffAll();
    const [name, setName] = useState(record?.name ?? '');
    const [enabled, setEnabled] = useState(record?.enabled ?? true);
    const [status, setStatus] = useState<StaffStatus>(record?.status ?? 'offline');
    const [error, setError] = useState('');

    const nextCode = useMemo(() => {
        const max = Math.max(0, ...(staff ?? []).map((item) => Number(item.code.replace(/\D/g, '')) || 0));
        return `K${Math.max(1010, max + 1)}`;
    }, [staff]);

    const submit = async () => {
        const value = name.trim();
        if (!value) {
            setError('请输入客服名称');
            return;
        }
        if ((staff ?? []).some((item) => item.name === value && item.id !== record?.id)) {
            setError('客服名称已存在');
            return;
        }
        setError('');
        const body: StaffSaveRequest = isEdit
            ? {
                  code: record.code,
                  name: value,
                  enabled,
                  status,
                  load: record.load,
                  max: record.max,
                  today: record.today,
                  firstResp: record.firstResp,
                  score: record.score,
                  phone: record.phone,
                  joinDate: record.joinDate,
                  color: record.color,
              }
            : {
                  code: nextCode,
                  name: value,
                  enabled,
                  status,
                  load: 0,
                  max: 20,
                  today: 0,
                  firstResp: 0,
                  score: 0,
                  phone: '—',
                  joinDate: today(),
                  color: '#e8f3ff',
              };
        await save.mutateAsync({ ...(isEdit ? { id: record.id } : {}), body });
        Toast.success(isEdit ? '客服已保存' : '客服已新增');
        onClose();
    };

    return (
        <SideSheet
            visible
            title={isEdit ? `编辑客服 · ${record.name}` : '新增客服'}
            width={560}
            onCancel={onClose}
            maskClosable={false}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={save.isPending} onClick={() => void submit().catch(() => undefined)}>
                        {isEdit ? '保存' : '新增'}
                    </Button>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        客服名称
                    </div>
                    <Input
                        value={name}
                        placeholder="请输入客服名称"
                        maxLength={32}
                        onChange={(value) => {
                            setName(value);
                            setError('');
                        }}
                    />
                    {error && (
                        <Typography.Text type="danger" size="small">
                            {error}
                        </Typography.Text>
                    )}
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            是否启用
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                            <Switch checked={enabled} onChange={setEnabled} aria-label="是否启用" />
                            <span className="im-muted">{enabled ? '启用' : '停用'}</span>
                        </div>
                    </label>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            当前状态
                        </div>
                        <Select value={status} optionList={STATUS_OPTIONS} style={{ width: '100%' }} onChange={(value) => setStatus(value as StaffStatus)} />
                    </label>
                </div>
                <Typography.Text type="tertiary" size="small">
                    停用后不再参与自动分流；挂起不参与自动分流，可被手动转接。
                </Typography.Text>

                {isEdit && (
                    <>
                        <div className="im-section__title" style={{ marginTop: 4 }}>
                            今日服务
                        </div>
                        <div className="im-kv">
                            <span className="im-kv__k">客服账号</span>
                            <span>{record.code}</span>
                            <span className="im-kv__k">手机号</span>
                            <span>{record.phone || '—'}</span>
                            <span className="im-kv__k">接待会话</span>
                            <span>{record.today} 个</span>
                            <span className="im-kv__k">当前负载</span>
                            <span>{record.load}</span>
                            <span className="im-kv__k">平均首响</span>
                            <span>{record.firstResp ? `${record.firstResp} 秒` : '—'}</span>
                        </div>
                    </>
                )}
            </div>
        </SideSheet>
    );
}
