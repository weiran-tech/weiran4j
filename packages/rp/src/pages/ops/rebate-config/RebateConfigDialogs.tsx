import { Button, Checkbox, Input, InputNumber, Modal, Radio, RadioGroup, Select, Space, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsCategoryRule, OpsConfig, OpsLevel, OpsUserRow, RebateCategory, RebateMode } from '@/hooks/queries/ops';
import { RATE_MAX, REBATE_CATEGORIES } from '../ops';

/** 生成两类目默认规则；传入 source 时保留已有配置 */
export function createRules(source?: OpsCategoryRule[]): OpsCategoryRule[] {
    return REBATE_CATEGORIES.map((category) => {
        const rule = source?.find((item) => item.category === category);
        if (rule) return { ...rule };
        return {
            category,
            enabled: true,
            mode: category === '账号' ? 'rate' : 'fixed',
            rate: category === '账号' ? 5 : 0,
            amount: category === '道具' ? 5 : 0,
        };
    });
}

/** 校验规则：启用的类目必须有大于 0 的取值，比例不超过上限 */
export function validateRules(rules: OpsCategoryRule[]): string {
    for (const rule of rules) {
        if (!rule.enabled) continue;
        if (rule.mode === 'rate') {
            if (!(rule.rate > 0)) return `${rule.category}返利比例需大于 0`;
            if (rule.rate > RATE_MAX) return `${rule.category}返利比例不得高于 ${RATE_MAX}%`;
        } else if (!(rule.amount > 0)) {
            return `${rule.category}固定返利金额需大于 0`;
        }
    }
    return '';
}

/** 单个类目的规则编辑：是否返利 + 比例 / 固定金额 */
export function RuleEditor({ rule, onChange }: { rule: OpsCategoryRule; onChange: (rule: OpsCategoryRule) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <Checkbox
                checked={rule.enabled}
                onChange={(event) => onChange({ ...rule, enabled: Boolean(event.target.checked) })}
            >
                {rule.category}返利
            </Checkbox>
            {rule.enabled && (
                <>
                    <RadioGroup
                        type="button"
                        value={rule.mode}
                        onChange={(event) => onChange({ ...rule, mode: event.target.value as RebateMode })}
                    >
                        <Radio value="rate">按比例</Radio>
                        <Radio value="fixed">固定金额</Radio>
                    </RadioGroup>
                    {rule.mode === 'rate' ? (
                        <InputNumber
                            aria-label={`${rule.category}返利比例`}
                            min={0.1}
                            max={RATE_MAX}
                            step={0.1}
                            value={rule.rate}
                            onChange={(value) => onChange({ ...rule, rate: Number(value) })}
                            style={{ width: 110 }}
                        />
                    ) : (
                        <InputNumber
                            aria-label={`${rule.category}固定返利金额`}
                            min={0.01}
                            step={1}
                            precision={2}
                            value={rule.amount}
                            onChange={(value) => onChange({ ...rule, amount: Number(value) })}
                            style={{ width: 110 }}
                        />
                    )}
                    <span className="ops-sub">
                        {rule.mode === 'rate' ? '%' : '元/单'}
                    </span>
                </>
            )}
            {!rule.enabled && <span className="ops-sub">该类目不返利</span>}
        </div>
    );
}

/** 全局规则：确认收货后 N 小时、利润门槛、资金审核模式 */
export function GlobalRuleModal({ config, onClose }: { config: OpsConfig; onClose: () => void }) {
    const action = useOpsAction('config');
    const [settleHours, setSettleHours] = useState(config.settleHours);
    const [profitThreshold, setProfitThreshold] = useState(config.profitThreshold);
    const [audit, setAudit] = useState(config.audit);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!(settleHours >= 0)) return setError('确认收货后的小时数不能小于 0');
        if (!(profitThreshold >= 0)) return setError('利润门槛不能小于 0');
        await action.mutateAsync({
            action: 'saveConfig',
            body: { settleHours: Math.round(settleHours), profitThreshold: Math.round(profitThreshold * 100) / 100, audit },
        });
        Toast.success('全局返利规则已更新');
        onClose();
    };

    return (
        <Modal
            visible
            title="编辑全局返利规则"
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
            <div style={{ marginBottom: 6, fontSize: 13 }}>确认收货后多少小时生成返利单</div>
            <InputNumber
                aria-label="确认收货后小时数"
                min={0}
                max={720}
                step={1}
                value={settleHours}
                onChange={(value) => {
                    setSettleHours(Number(value));
                    setError('');
                }}
                style={{ width: 200 }}
            />
            <div className="ops-form-hint">买家确认收货后满该时长，系统才按等级规则生成返利单。</div>
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>订单利润低于多少不返（元）</div>
            <InputNumber
                aria-label="利润门槛"
                min={0}
                step={1}
                precision={2}
                value={profitThreshold}
                onChange={(value) => {
                    setProfitThreshold(Number(value));
                    setError('');
                }}
                style={{ width: 200 }}
            />
            <div className="ops-form-hint">订单利润低于该金额时不生成返利，避免返利高于利润。</div>
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>资金审核模式</div>
            <RadioGroup type="button" value={audit ? 'audit' : 'free'} onChange={(event) => setAudit(event.target.value === 'audit')}>
                <Radio value="audit">资金审核</Radio>
                <Radio value="free">免审核</Radio>
            </RadioGroup>
            <div className="ops-form-hint">
                {audit ? '返利单先生成在待审核列表，人工确认后才进入用户钱包。' : '返利单生成即置为已返利，直接进入用户钱包。'}
            </div>
            {error && <div className="ops-form-error">{error}</div>}
        </Modal>
    );
}

/** 新增 / 编辑返利等级：按类目设置比例或固定金额 */
export function LevelModal({
    level,
    levels,
    onClose,
}: {
    level: OpsLevel | null;
    levels: OpsLevel[];
    onClose: () => void;
}) {
    const action = useOpsAction('config');
    const [code, setCode] = useState(level?.code ?? '');
    const [name, setName] = useState(level?.name ?? '');
    const [rules, setRules] = useState<OpsCategoryRule[]>(createRules(level?.rules));
    const [error, setError] = useState('');

    const updateRule = (category: RebateCategory, rule: OpsCategoryRule) => {
        setRules((current) => current.map((item) => (item.category === category ? rule : item)));
        setError('');
    };

    const submit = async () => {
        const nextCode = code.trim().toUpperCase();
        if (!nextCode) return setError('请填写等级编码，如 A / F');
        if (levels.some((item) => item.code === nextCode && item.id !== level?.id)) return setError('等级编码已存在');
        if (!name.trim()) return setError('请填写等级名称，如 一级代理');
        const ruleError = validateRules(rules);
        if (ruleError) return setError(ruleError);
        await action.mutateAsync({
            action: 'saveLevel',
            body: { ...(level ? { id: level.id } : {}), code: nextCode, name: name.trim(), rules },
        });
        Toast.success(level ? `已更新等级 ${nextCode} · ${name.trim()}` : `已新增等级 ${nextCode} · ${name.trim()}`);
        onClose();
    };

    return (
        <Modal
            visible
            title={level ? '编辑返利等级' : '新增返利等级'}
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
            <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 6, fontSize: 13 }}>等级编码</div>
                    <Input
                        aria-label="等级编码"
                        value={code}
                        onChange={(value) => {
                            setCode(value);
                            setError('');
                        }}
                        placeholder="如 A / F"
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 6, fontSize: 13 }}>等级名称</div>
                    <Input
                        aria-label="等级名称"
                        value={name}
                        onChange={(value) => {
                            setName(value);
                            setError('');
                        }}
                        placeholder="如 一级代理"
                    />
                </div>
            </div>
            <div className="ops-form-hint">A-E 为默认五级，可按业务继续新增，如六级代理。</div>
            <div style={{ margin: '14px 0 8px', fontSize: 13 }}>类目返利规则</div>
            {rules.map((rule) => (
                <RuleEditor key={rule.category} rule={rule} onChange={(value) => updateRule(rule.category, value)} />
            ))}
            <div className="ops-form-hint">
                该类目返利按订单成交额计算比例，或每单固定金额；关闭的类目该等级不返利。
            </div>
            {error && <div className="ops-form-error">{error}</div>}
        </Modal>
    );
}

/** 添加代理等级成员：把指定用户分配到一个返利等级（或取消等级） */
export function LevelMemberModal({
    defaultLevel,
    levels,
    users,
    onClose,
}: {
    defaultLevel: string;
    levels: OpsLevel[];
    users: OpsUserRow[];
    onClose: () => void;
}) {
    const action = useOpsAction('user');
    const [uidText, setUidText] = useState('');
    const [levelCode, setLevelCode] = useState(defaultLevel);
    const [uidError, setUidError] = useState('');

    const submit = async () => {
        const query = uidText.trim().replace(/\s/g, '');
        const hits = query
            ? users.filter(
                  (item) =>
                      item.uid === query ||
                      item.displayId.toLowerCase() === query.toLowerCase() ||
                      item.phone === query,
              )
            : [];
        if (!hits.length) return setUidError('未找到匹配的用户，请核对用户ID / 展示ID / 手机号');
        if (hits.length > 1) return setUidError(`匹配到 ${hits.length} 位用户，请输入完整用户ID`);
        const target = hits[0]!.uid;
        await action.mutateAsync({ action: 'setUserLevel', body: { uid: target, level: levelCode } });
        const level = levels.find((item) => item.code === levelCode);
        Toast.success(level ? `已设置用户 ${target} 为 ${level.code} · ${level.name}` : `已取消用户 ${target} 的代理等级`);
        onClose();
    };

    const matched = uidText.trim() ? users.find((item) => item.uid === uidText.trim()) : undefined;

    return (
        <Modal
            visible
            title="添加等级成员"
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
            <div style={{ marginBottom: 6, fontSize: 13 }}>用户ID</div>
            <Input
                value={uidText}
                onChange={(value) => {
                    setUidText(value);
                    setUidError('');
                }}
                placeholder="请输入用户ID，如 100237"
            />
            <div className="ops-form-hint">
                支持用户ID / 展示ID / 手机号，命中唯一用户后分配到该等级
            </div>
            {uidError && <div className="ops-form-error">{uidError}</div>}
            <div style={{ margin: '14px 0 6px', fontSize: 13 }}>代理等级</div>
            <Select
                value={levelCode || 'none'}
                onChange={(value) => {
                    setLevelCode(String(value ?? 'none') === 'none' ? '' : String(value));
                }}
                optionList={[
                    { label: '无等级（不自动返利，可手动录入）', value: 'none' },
                    ...levels.map((item) => ({ label: `${item.code} · ${item.name}`, value: item.code })),
                ]}
                style={{ width: '100%' }}
            />
            <div className="ops-form-hint">
                等级决定该用户的自动返利规则：按类目使用比例或固定金额，低于利润门槛的订单不返。
                {matched ? ` 当前等级：${levels.find((item) => item.code === matched.level)?.name ?? '无等级'}。` : ''}
            </div>
        </Modal>
    );
}

/** 查看某个等级下的成员，可移除成员或继续添加 */
export function LevelMembersModal({
    level,
    users,
    onAdd,
    onClose,
}: {
    level: OpsLevel;
    users: OpsUserRow[];
    onAdd: () => void;
    onClose: () => void;
}) {
    const action = useOpsAction('user');
    const members = users.filter((user) => user.level === level.code);

    const remove = (user: OpsUserRow) => {
        action.mutate(
            { action: 'setUserLevel', body: { uid: user.uid, level: '' } },
            { onSuccess: () => Toast.success(`已将 ${user.uid} 移出等级 ${level.code}`) },
        );
    };

    const columns: ColumnProps<OpsUserRow>[] = [
        {
            title: '用户',
            dataIndex: 'uid',
            render: (_: unknown, row: OpsUserRow) => (
                <div className="ops-cell2">
                    <span>{row.nickname}</span>
                    <span className="ops-cell2__sub ops-mono">
                        {row.uid} · {row.displayId} · {row.phone}
                    </span>
                </div>
            ),
        },
        {
            title: '操作',
            dataIndex: 'actions',
            width: 100,
            render: (_: unknown, row: OpsUserRow) => (
                <Button theme="borderless" type="danger" size="small" onClick={() => remove(row)}>
                    移除
                </Button>
            ),
        },
    ];

    return (
        <Modal
            visible
            title={`成员 · ${level.code} ${level.name}`}
            width={720}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>关闭</Button>
                    <Button type="primary" theme="solid" onClick={onAdd}>
                        添加成员
                    </Button>
                </Space>
            }
        >
            <Table<OpsUserRow>
                rowKey="id"
                columns={columns}
                dataSource={members}
                pagination={false}
                size="small"
                empty={<span className="ops-sub">该等级暂无成员，点击「添加成员」分配</span>}
            />
            <div className="ops-form-hint">移除后该用户变为无等级，不自动生成返利，可在返利明细手动录入。</div>
        </Modal>
    );
}
