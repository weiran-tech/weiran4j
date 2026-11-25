import { Button, InputNumber, Modal, RadioGroup, Select, Space, Table, Tabs, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import {
    useDeleteRoutingRule,
    useRoutingFallbacks,
    useRoutingRules,
    useSaveRoutingFallback,
    useSaveRoutingRule,
    useStaffAll,
} from '@/hooks/queries/im';
import { useTableDefaults } from '@/hooks/useTableDefaults';
import type { RoutingFallbackView, RoutingRuleView, RoutingScene } from '@/types/api';
import './im.css';

const SCENE_META: Record<RoutingScene, { label: string; desc: string }> = {
    presale: { label: '售前群', desc: '买家下单咨询、尚未付款阶段自动建群' },
    trade: { label: '交易群', desc: '订单支付成功后自动建群' },
};

const MODE_OPTIONS = [
    { label: '进群数量', value: 'count' },
    { label: '全部进群', value: 'all' },
];

export function formatRange(min: number, max: number | null): string {
    const value = (n: number) => `¥${n.toLocaleString('zh-CN')}`;
    return max === null ? `${value(min)} 以上` : `${value(min)} ~ ${value(max)}`;
}

export function modeText(mode: 'count' | 'all', count: number): string {
    return mode === 'all' ? '全部进群' : `进群数量 ${count} 位`;
}

function overlap(aMin: number, aMax: number | null, bMin: number, bMax: number | null): boolean {
    const aEnd = aMax ?? Number.POSITIVE_INFINITY;
    const bEnd = bMax ?? Number.POSITIVE_INFINITY;
    return aMin < bEnd && bMin < aEnd;
}

function StaffTags({ names }: { names: string[] }) {
    return names.length ? (
        <Space wrap spacing={4}>
            {names.map((name) => (
                <Tag key={name} size="small" color="blue">
                    {name}
                </Tag>
            ))}
        </Space>
    ) : (
        <span className="im-muted">未配置</span>
    );
}

interface RuleModalProps {
    scene: RoutingScene;
    record: RoutingRuleView | null;
    rules: RoutingRuleView[];
    onClose: () => void;
}

function RuleModal({ scene, record, rules, onClose }: RuleModalProps) {
    const save = useSaveRoutingRule();
    const { data: staff } = useStaffAll();
    const [min, setMin] = useState(record?.min ?? 0);
    const [max, setMax] = useState<number | null>(record?.max ?? null);
    const [staffNames, setStaffNames] = useState<string[]>(record?.staffNames ?? []);
    const [mode, setMode] = useState<'count' | 'all'>(record?.mode ?? 'count');
    const [count, setCount] = useState(record?.count ?? 1);
    const [error, setError] = useState('');

    const optionList = (staff ?? []).map((item) => ({
        value: item.name,
        label: `${item.name}（${item.status === 'online' ? '在线' : item.status === 'busy' ? '挂起' : '离线'}）`,
    }));

    const submit = async () => {
        if (!staffNames.length) {
            setError('请至少选择一位客服');
            return;
        }
        if (max !== null && max <= min) {
            setError('金额上限需大于下限');
            return;
        }
        if (rules.some((item) => item.id !== record?.id && overlap(min, max, item.min, item.max))) {
            setError('金额区间与已有规则重叠');
            return;
        }
        if (mode === 'count' && (count < 1 || count > staffNames.length)) {
            setError(`进群数量需在 1–${staffNames.length} 之间`);
            return;
        }
        setError('');
        await save.mutateAsync({
            ...(record ? { id: record.id } : {}),
            body: {
                scene,
                min,
                max,
                staffNames,
                mode,
                count: mode === 'all' ? staffNames.length : count,
                sort: record?.sort ?? rules.length + 1,
            },
        });
        Toast.success(record ? '分流规则已保存' : '分流规则已新增');
        onClose();
    };

    return (
        <Modal
            visible
            title={`${record ? '编辑' : '新增'}分流规则 · ${SCENE_META[scene].label}`}
            width={560}
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            金额下限（含）
                        </div>
                        <InputNumber min={0} value={min} hideButtons onChange={(value) => setMin(Number(value) || 0)} style={{ width: '100%' }} />
                    </label>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            金额上限（不含，留空不封顶）
                        </div>
                        <InputNumber
                            min={1}
                            value={max ?? ''}
                            placeholder="不封顶"
                            hideButtons
                            onChange={(value) => setMax(value === undefined || value === '' ? null : Number(value))}
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        可选客服（列表顺序即进群优先级）
                    </div>
                    <Select
                        multiple
                        value={staffNames}
                        placeholder="请选择客服"
                        optionList={optionList}
                        onChange={(value) => setStaffNames(value as string[])}
                        style={{ width: '100%' }}
                    />
                </label>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        进群方式
                    </div>
                    <RadioGroup
                        type="button"
                        value={mode}
                        options={MODE_OPTIONS}
                        onChange={(event) => setMode(event.target.value as 'count' | 'all')}
                    />
                </label>
                {mode === 'count' && (
                    <label>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            进群客服数量
                        </div>
                        <InputNumber
                            min={1}
                            max={Math.max(1, staffNames.length)}
                            value={count}
                            hideButtons
                            onChange={(value) => setCount(Number(value) || 1)}
                            style={{ width: 160 }}
                        />
                        <div className="im-muted" style={{ marginTop: 6 }}>
                            取所选客服的前 N 位，不能超过所选客服数量（当前已选 {staffNames.length} 位）。
                        </div>
                    </label>
                )}
                {error && <Typography.Text type="danger">{error}</Typography.Text>}
            </div>
        </Modal>
    );
}

function FallbackModal({ scene, record, onClose }: { scene: RoutingScene; record: RoutingFallbackView | undefined; onClose: () => void }) {
    const save = useSaveRoutingFallback();
    const { data: staff } = useStaffAll();
    const [staffNames, setStaffNames] = useState<string[]>(record?.staffNames ?? []);
    const [mode, setMode] = useState<'count' | 'all'>(record?.mode ?? 'count');
    const [count, setCount] = useState(record?.count ?? 1);
    const [error, setError] = useState('');

    const optionList = (staff ?? []).map((item) => ({
        value: item.name,
        label: `${item.name}（${item.status === 'online' ? '在线' : item.status === 'busy' ? '挂起' : '离线'}）`,
    }));

    const submit = async () => {
        if (!staffNames.length) {
            setError('请至少选择一位兜底客服');
            return;
        }
        if (mode === 'count' && (count < 1 || count > staffNames.length)) {
            setError(`进群数量需在 1–${staffNames.length} 之间`);
            return;
        }
        setError('');
        await save.mutateAsync({
            ...(record ? { id: record.id } : {}),
            body: { scene, staffNames, mode, count: mode === 'all' ? staffNames.length : count },
        });
        Toast.success('兜底规则已保存');
        onClose();
    };

    return (
        <Modal
            visible
            title={`编辑兜底规则 · ${SCENE_META[scene].label}`}
            width={560}
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Typography.Text type="tertiary" size="small">
                    该规则仅在金额未落入上方任何区间时生效，命中区间时仍按对应区间规则拉群。
                </Typography.Text>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        兜底客服（可多选）
                    </div>
                    <Select
                        multiple
                        value={staffNames}
                        placeholder="请选择客服"
                        optionList={optionList}
                        onChange={(value) => setStaffNames(value as string[])}
                        style={{ width: '100%' }}
                    />
                </label>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        进群方式
                    </div>
                    <RadioGroup type="button" value={mode} options={MODE_OPTIONS} onChange={(event) => setMode(event.target.value as 'count' | 'all')} />
                </label>
                {mode === 'count' && (
                    <label>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            进群客服数量
                        </div>
                        <InputNumber
                            min={1}
                            max={Math.max(1, staffNames.length)}
                            value={count}
                            hideButtons
                            onChange={(value) => setCount(Number(value) || 1)}
                            style={{ width: 160 }}
                        />
                    </label>
                )}
                {error && <Typography.Text type="danger">{error}</Typography.Text>}
            </div>
        </Modal>
    );
}

export default function RoutingPage() {
    const [scene, setScene] = useState<RoutingScene>('presale');
    const [editingRule, setEditingRule] = useState<RoutingRuleView | null | undefined>(undefined);
    const [fallbackScene, setFallbackScene] = useState<RoutingScene | null>(null);
    const { tableProps } = useTableDefaults();
    const { data: rules } = useRoutingRules();
    const { data: fallbacks } = useRoutingFallbacks();
    const remove = useDeleteRoutingRule();

    const counts = useMemo(
        () => ({
            presale: (rules ?? []).filter((item) => item.scene === 'presale').length,
            trade: (rules ?? []).filter((item) => item.scene === 'trade').length,
        }),
        [rules],
    );

    const actionsOf = (record: RoutingRuleView): TableAction[] => [
        { key: 'edit', label: '编辑', onClick: () => setEditingRule(record) },
        {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: { title: '确定删除该金额区间？', content: formatRange(record.min, record.max) },
            onClick: () => remove.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];

    const columns: ColumnProps<RoutingRuleView>[] = [
        { title: '金额区间', dataIndex: 'min', width: 200, render: (_: unknown, record) => <span className="im-range">{formatRange(record.min, record.max)}</span> },
        { title: '可选客服', dataIndex: 'staffNames', render: (_: unknown, record) => <StaffTags names={record.staffNames} /> },
        { title: '进群规则', dataIndex: 'mode', width: 180, render: (_: unknown, record) => <span className="im-rule-text">{modeText(record.mode, record.count)}</span> },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 130 },
    ];

    const { columns: tableColumns } = useActionsColumn(columns, actionsOf);

    const renderScene = (target: RoutingScene) => {
        const targetRules = (rules ?? []).filter((item) => item.scene === target).sort((a, b) => a.sort - b.sort);
        const targetFallback = (fallbacks ?? []).find((item) => item.scene === target);
        return (
            <>
                <div className="im-section" style={{ marginTop: 12 }}>
                    <div className="im-section__head">
                        <span className="im-section__title">{SCENE_META[target].label} · 分流规则</span>
                        <span className="im-section__desc">{SCENE_META[target].desc}</span>
                        <div style={{ flex: 1 }} />
                        <Button type="primary" theme="solid" onClick={() => setEditingRule(null)}>
                            + 新增金额区间
                        </Button>
                    </div>
                    <Table<RoutingRuleView>
                        {...tableProps}
                        rowKey="id"
                        columns={tableColumns}
                        dataSource={targetRules}
                        pagination={false}
                    />
                </div>
                <div className="im-section">
                    <div className="im-section__head">
                        <span className="im-section__title">兜底规则 · 未命中金额区间时生效</span>
                        <div style={{ flex: 1 }} />
                        <Button onClick={() => setFallbackScene(target)}>编辑兜底规则</Button>
                    </div>
                    <div className="im-kv">
                        <span className="im-kv__k">兜底客服</span>
                        <span>
                            <StaffTags names={targetFallback?.staffNames ?? []} />
                        </span>
                        <span className="im-kv__k">进群规则</span>
                        <span>{targetFallback ? modeText(targetFallback.mode, targetFallback.count) : '未配置'}</span>
                    </div>
                </div>
            </>
        );
    };

    const activeScene = editingRule?.scene ?? fallbackScene ?? scene;

    return (
        <PageContainer title="客服分组与分流">
            <Tabs type="line" activeKey={scene} onChange={(key) => setScene(key as RoutingScene)}>
                <Tabs.TabPane itemKey="presale" tab={`售前群（${counts.presale}）`}>
                    {renderScene('presale')}
                </Tabs.TabPane>
                <Tabs.TabPane itemKey="trade" tab={`交易群（${counts.trade}）`}>
                    {renderScene('trade')}
                </Tabs.TabPane>
            </Tabs>
            {editingRule !== undefined && (
                <RuleModal
                    scene={activeScene}
                    record={editingRule}
                    rules={(rules ?? []).filter((item) => item.scene === activeScene)}
                    onClose={() => setEditingRule(undefined)}
                />
            )}
            {fallbackScene && (
                <FallbackModal
                    scene={fallbackScene}
                    record={(fallbacks ?? []).find((item) => item.scene === fallbackScene)}
                    onClose={() => setFallbackScene(null)}
                />
            )}
        </PageContainer>
    );
}
