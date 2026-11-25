import { Button, Input, Modal, Space, Toast } from '@douyinfe/semi-ui';
import { useState, type ReactNode } from 'react';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsUserRow } from '@/hooks/queries/ops';
import { OpsDetailSheet, OpsKv, OpsPlainTag, OpsSection, OpsStatusTag } from '../ops';

/** 用户详情：基础信息 + 交易风控，底部放账号状态操作 */
export function UserDetailSheet({
    row,
    onEditDisplay,
    onClose,
}: {
    row: OpsUserRow;
    onEditDisplay: (row: OpsUserRow) => void;
    onClose: () => void;
}) {
    const action = useOpsAction('user');
    const changeStatus = (status: string, logAction: string, tip: string) => {
        action.mutate(
            { action: 'setUserStatus', id: row.id, body: { status, logAction } },
            {
                onSuccess: () => {
                    Toast.success(tip);
                    onClose();
                },
            },
        );
    };
    const info: [string, ReactNode][] = [
        ['用户ID', <span className="ops-mono">{row.uid}</span>],
        ['展示ID', <span className="ops-mono">{row.displayId}</span>],
        ['昵称', row.nickname],
        ['手机号', <span className="ops-mono">{row.phone}</span>],
        ['注册时间', row.reg],
        ['姓名', row.realName],
        ['身份证号', <span className="ops-mono">{row.idcard}</span>],
        ['角色', <OpsPlainTag value={row.role} brand={row.role === '商家'} />],
        ['实名状态', <OpsStatusTag value={row.real} />],
        ['账号状态', <OpsStatusTag value={row.status} />],
    ];
    return (
        <OpsDetailSheet
            visible
            title={`用户详情 · ${row.uid}`}
            onClose={onClose}
            footer={
                <>
                    <Button onClick={() => onEditDisplay(row)}>修改展示ID</Button>
                    {row.status === '封禁' ? (
                        <Button type="primary" theme="solid" onClick={() => changeStatus('正常', '解除封禁', '已解除封禁')}>
                            解除封禁
                        </Button>
                    ) : (
                        <>
                            <Button type="danger" onClick={() => changeStatus('封禁', '封禁账号', '账号已封禁')}>
                                封禁账号
                            </Button>
                            <Button onClick={() => changeStatus('冻结', '冻结账号', '账号已冻结')}>冻结</Button>
                        </>
                    )}
                </>
            }
        >
            <OpsSection title="基础信息" />
            <OpsKv items={info} />
            <OpsSection title="交易与风控" />
            <OpsKv
                items={[
                    ['成交单数', <span className="ops-money">{row.orders}</span>],
                    [
                        '在途工单',
                        row.nickname === '风语工作室' ? (
                            <OpsPlainTag value="1 条未完结" brand />
                        ) : (
                            <OpsPlainTag value="无" />
                        ),
                    ],
                ]}
            />
        </OpsDetailSheet>
    );
}

/** 修改展示ID：4–20 位字母 / 数字 / 下划线，全平台唯一 */
export function EditDisplayModal({
    row,
    users,
    onClose,
}: {
    row: OpsUserRow;
    users: OpsUserRow[];
    onClose: () => void;
}) {
    const action = useOpsAction('user');
    const [value, setValue] = useState(row.displayId);
    const [error, setError] = useState('');

    const submit = async () => {
        const next = value.trim();
        if (!next) return setError('请输入展示ID');
        if (!/^[A-Za-z0-9_]{4,20}$/.test(next)) return setError('格式不正确：需 4–20 位字母、数字或下划线');
        if (next === row.displayId) return setError('新展示ID与当前一致，无需修改');
        if (users.some((user) => user.uid !== row.uid && user.displayId.toLowerCase() === next.toLowerCase())) {
            return setError('该展示ID已被占用，请更换');
        }
        const before = row.displayId;
        await action.mutateAsync({ action: 'update', id: row.id, body: { displayId: next } });
        await action.mutateAsync({
            action: 'addLog',
            id: row.id,
            body: { actionName: '修改展示ID', remark: `展示ID 由 ${before} 修改为 ${next}` },
        });
        Toast.success(`展示ID 已由 ${before} 修改为 ${next}`);
        onClose();
    };

    return (
        <Modal
            visible
            title="修改展示ID"
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        保存
                    </Button>
                </Space>
            }
        >
            <div style={{ marginBottom: 12, fontSize: 13 }}>用户</div>
            <Input value={`${row.nickname}（用户ID ${row.uid}）`} disabled />
            <div style={{ margin: '12px 0 4px', fontSize: 13 }}>当前展示ID</div>
            <Input value={row.displayId} disabled />
            <div style={{ margin: '12px 0 4px', fontSize: 13 }}>新的展示ID</div>
            <Input
                value={value}
                onChange={(next) => {
                    setValue(next);
                    setError('');
                }}
                maxLength={20}
                placeholder="请输入新的展示ID"
                showClear
            />
            <div className="ops-form-hint">
                4–20 位，仅支持字母、数字与下划线，需全平台唯一。保存后用户端立即生效，30 天内仅可修改 1 次。
            </div>
            {error && <div className="ops-form-error">{error}</div>}
        </Modal>
    );
}
