import { Button, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { TableActions, type TableAction } from '@/components/TableActions';
import { useOpsAction, useOpsConfig, useOpsListAll } from '@/hooks/queries/ops';
import type { OpsCategoryRule, OpsLevel, OpsUserRow } from '@/hooks/queries/ops';
import {
    OpsNote,
    OpsPageTip,
    OpsTitle,
    RATE_MAX,
    REBATE_CATEGORIES,
    categoryRule,
    money,
    rebateModeName,
    rebateRuleText,
} from '../ops';
import { GlobalRuleModal, LevelMemberModal, LevelMembersModal, LevelModal } from './RebateConfigDialogs';

/** 单个类目返利规则的展示：不返 / 按比例 5% / 固定金额 ¥6.00 */
function RuleCell({ rule }: { rule: OpsCategoryRule }) {
    if (!rule.enabled) return <Tag size="small" color="grey">不返</Tag>;
    return (
        <span>
            <Tag size="small" color={rule.mode === 'fixed' ? 'violet' : 'light-blue'}>
                {rebateModeName(rule.mode)}
            </Tag>
            <span className="ops-money" style={{ marginLeft: 6 }}>
                {rebateRuleText(rule.mode, rule.rate, rule.amount)}
            </span>
        </span>
    );
}

export default function RebateConfigPage() {
    const { data: config } = useOpsConfig();
    const { data: users = [] } = useOpsListAll<OpsUserRow>('user');
    const configAction = useOpsAction('config');
    const [globalOpen, setGlobalOpen] = useState(false);
    const [levelModal, setLevelModal] = useState<{ level: OpsLevel | null } | null>(null);
    const [memberModal, setMemberModal] = useState<{ level: string } | null>(null);
    const [memberView, setMemberView] = useState<{ level: OpsLevel } | null>(null);

    const levels = config?.levels ?? [];
    const levelMembers = (code: string) => users.filter((user) => user.level === code).length;

    const toggleAudit = () => {
        if (!config) return;
        const next = !config.audit;
        configAction.mutate(
            { action: 'saveConfig', body: { audit: next } },
            {
                onSuccess: () =>
                    Toast.success(next ? '已切换为资金审核：新返利单需人工确认后入钱包' : '已切换为免审核：新返利单生成即入钱包'),
            },
        );
    };

    const removeLevel = (row: OpsLevel) => {
        configAction.mutate(
            { action: 'deleteLevel', id: row.id, method: 'DELETE' },
            { onSuccess: () => Toast.success(`已删除等级 ${row.code} · ${row.name}`) },
        );
    };

    const levelColumns: ColumnProps<OpsLevel>[] = [
        {
            title: '等级',
            dataIndex: 'code',
            width: 180,
            render: (value: string, row: OpsLevel) => (
                <div className="ops-cell2">
                    <span>
                        {value} · {row.name}
                    </span>
                    <span className="ops-cell2__sub">按类目独立配置</span>
                </div>
            ),
        },
        ...REBATE_CATEGORIES.map<ColumnProps<OpsLevel>>((category) => ({
            title: `${category}返利`,
            dataIndex: category,
            width: 220,
            render: (_: unknown, row: OpsLevel) => <RuleCell rule={categoryRule(row.rules, category)} />,
        })),
        {
            title: '成员',
            dataIndex: 'members',
            width: 90,
            render: (_: unknown, row: OpsLevel) => <span className="ops-money">{levelMembers(row.code)} 人</span>,
        },
        { title: '操作', dataIndex: 'actions', width: 130 },
    ];

    const levelActions = (row: OpsLevel): TableAction[] => [
        { key: 'edit', label: '编辑', onClick: () => setLevelModal({ level: row }) },
        { key: 'members', label: '查看成员', onClick: () => setMemberView({ level: row }) },
        { key: 'addMember', label: '添加成员', onClick: () => setMemberModal({ level: row.code }) },
        {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: {
                title: `确定删除等级 ${row.code} · ${row.name}？`,
                content: '该等级用户将不再自动产生返利，需要重新分配等级',
            },
            onClick: () => removeLevel(row),
        },
    ];

    return (
        <PageContainer
            title={<OpsTitle name="返利配置" desc="等级 × 类目的比例 / 固定金额、利润门槛与审核模式" />}
            extra={<OpsPageTip>比例上限 {RATE_MAX}%；无等级用户按手动金额返利</OpsPageTip>}
        >
            <OpsNote>
                买家<b>确认收货</b>后满设定小时数才生成返利单。返利按<b>类目</b>计算，等级可对不同类目分别设置<b>比例</b>或<b>固定金额</b>，
                在等级行的<b>查看成员 / 添加成员</b>中指定哪些用户属于该等级；某类目关闭则该类目不返。订单利润低于<b>利润门槛</b>时不返，避免返利高于利润。
                无等级用户不自动生成返利，在<b>返利明细</b>由客服手动录入；同一订单可多次手动新增，支持多个返利对象与不同金额。
                资金审核开启时返利单先进入<b>待审核</b>，人工确认后才进入用户钱包。
            </OpsNote>
            {config && (
                <>
                    <div className="ops-panel">
                        <div className="ops-panel__head">
                            <span className="ops-panel__title">全局规则</span>
                            <span className="ops-panel__desc">返利生成时间、利润门槛与资金审核模式对全平台生效</span>
                            <Button theme="borderless" size="small" onClick={() => setGlobalOpen(true)}>
                                编辑全局规则
                            </Button>
                        </div>
                        <div className="ops-panel__body">
                            <div className="ops-kv">
                                <div className="ops-kv__k">返利生成时间</div>
                                <div className="ops-kv__v">
                                    <span className="ops-money">{config.settleHours} 小时</span>
                                    <span className="ops-sub"> · 买家确认收货后满 {config.settleHours} 小时生成返利单</span>
                                </div>
                                <div className="ops-kv__k">利润门槛</div>
                                <div className="ops-kv__v">
                                    <span className="ops-money">{money(config.profitThreshold)}</span>
                                    <span className="ops-sub"> · 订单利润低于该金额不返利</span>
                                </div>
                                <div className="ops-kv__k">资金审核模式</div>
                                <div className="ops-kv__v">
                                    <Tag size="small" color={config.audit ? 'orange' : 'green'}>
                                        {config.audit ? '资金审核' : '免审核'}
                                    </Tag>
                                    <span className="ops-sub">
                                        {' '}
                                        ·{' '}
                                        {config.audit
                                            ? '返利单先进入待审核，需人工确认后才进入用户钱包'
                                            : '返利单生成即置为已返利，直接进入用户钱包'}
                                    </span>
                                </div>
                            </div>
                            <Space style={{ marginTop: 14 }}>
                                <Button theme="borderless" size="small" loading={configAction.isPending} onClick={toggleAudit}>
                                    切换为{config.audit ? '免审核' : '资金审核'}
                                </Button>
                            </Space>
                        </div>
                    </div>
                    <div className="ops-panel">
                        <div className="ops-panel__head">
                            <span className="ops-panel__title">等级返利规则</span>
                            <span className="ops-panel__desc">
                                等级可按类目设置比例或固定金额；A-E 为默认五级，也可继续新增等级
                            </span>
                            <Button type="primary" theme="solid" size="small" onClick={() => setLevelModal({ level: null })}>
                                + 新增等级
                            </Button>
                        </div>
                        <Table<OpsLevel>
                            rowKey="id"
                            columns={levelColumns.map((column) =>
                                column.dataIndex === 'actions'
                                    ? {
                                          ...column,
                                          render: (_: unknown, row: OpsLevel) => <TableActions actions={levelActions(row)} />,
                                      }
                                    : column,
                            )}
                            dataSource={levels}
                            pagination={false}
                            size="small"
                            empty={<span className="ops-sub">暂无等级，请先新增等级并配置类目返利</span>}
                        />
                    </div>
                </>
            )}
            {config && globalOpen && <GlobalRuleModal config={config} onClose={() => setGlobalOpen(false)} />}
            {config && levelModal && (
                <LevelModal level={levelModal.level} levels={levels} onClose={() => setLevelModal(null)} />
            )}
            {config && memberModal && (
                <LevelMemberModal
                    defaultLevel={memberModal.level}
                    levels={levels}
                    users={users}
                    onClose={() => setMemberModal(null)}
                />
            )}
            {config && memberView && (
                <LevelMembersModal
                    level={memberView.level}
                    users={users}
                    onAdd={() => {
                        setMemberModal({ level: memberView.level.code });
                        setMemberView(null);
                    }}
                    onClose={() => setMemberView(null)}
                />
            )}
        </PageContainer>
    );
}
