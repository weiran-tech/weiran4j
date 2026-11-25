import { Button, Input, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useActionsColumn } from '@/components/TableActions';
import { VOUCHER_ST, money, money0 } from '@/biz/biz-dict';
import { useBizRows } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizPayoutAccountView, BizWithdrawalView } from '@/types/biz';
import { BizStatus, Cell, StatRules } from '../shared';

type VoucherState = 'hit' | 'miss' | 'expired' | 'offline';

interface Row {
    acct: string;
    provider: string;
    subject: string;
    acctLabel: string;
    off: boolean;
    state: VoucherState;
    text: string;
    url: string;
    fileName: string;
}

/**
 * 按流水号在全部出款账户里轮询凭证。
 *
 * 原型没有真的渠道对接：命中规则是「这个流水号出现在某条已到账提现单上」，
 * 凭证链接按账户的可查窗口（365 天）算 —— 超窗口就是查不到，
 * 这正是这一页要讲的事：老单子只有停用账户还查得到。
 */
function queryRows(no: string, accounts: BizPayoutAccountView[], withdrawals: BizWithdrawalView[]): Row[] {
    const q = no.trim().toUpperCase();
    const doc = withdrawals.find((w) => (w.tradeNo ?? '').toUpperCase() === q);
    return accounts.map((a): Row => {
        const base = {
            acct: a.code,
            provider: a.provider,
            subject: a.subject,
            acctLabel: a.acctLabel,
            off: Boolean(a.off),
        };
        if (!doc) {
            return { ...base, state: 'miss', text: '该账户没有这笔出款', url: '', fileName: '' };
        }
        if (doc.payMode === 'offline') {
            return {
                ...base,
                state: 'offline',
                text: '人工线下打款，渠道无凭证；回单见提现单附件',
                url: '',
                fileName: doc.proof ?? '',
            };
        }
        const days = Math.abs(Date.now() - new Date(String(doc.doneAt).replace(/-/g, '/')).getTime()) / 86400000;
        if (days > 365) {
            return { ...base, state: 'expired', text: '超出可查窗口（365 天）', url: '', fileName: '' };
        }
        const fileName = `转账凭证-${doc.code}.pdf`;
        return {
            ...base,
            state: 'hit',
            text: '',
            url: `https://payout.example.com/${a.code}/${fileName}`,
            fileName,
        };
    });
}

export default function VouchersPage() {
    const [draft, setDraft] = useState('');
    const [no, setNo] = useState('');
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data: accounts = [], isFetching } = useBizRows<BizPayoutAccountView>('bizPayoutAccount');
    const { data: withdrawals = [] } = useBizRows<BizWithdrawalView>('bizWithdrawal');

    const rows = no ? queryRows(no, accounts, withdrawals) : [];
    const shown = rows.filter((r) => r.state !== 'miss');
    const missN = rows.filter((r) => r.state === 'miss').length;
    const hitN = rows.filter((r) => r.state === 'hit').length;
    const doc = withdrawals.find((w) => (w.tradeNo ?? '').toUpperCase() === no.trim().toUpperCase());
    const onN = accounts.filter((a) => a.wd).length;

    const search = () => {
        const v = draft.trim();
        if (!v) {
            Toast.warning('先填渠道流水号');
            return;
        }
        setNo(v);
    };

    const verdict = (() => {
        if (!no) return '';
        if (!doc) return '系统里没有这个流水号的出款记录 —— 先核对流水号是否抄错，或这笔不是从本商户出款';
        if (doc.payMode === 'offline') return '这笔是人工线下打款，渠道侧没有凭证，看当时上传的回单';
        if (hitN) return `命中 ${hitN} 个出款账户`;
        return '单据在，但所有账户都超出可查窗口或未命中';
    })();

    const columns: ColumnProps<Row>[] = [
        {
            title: '出款账户',
            dataIndex: 'acct',
            width: 168,
            render: (_: unknown, r) => <Cell main={<span className="biz-mono">{r.acct}</span>} sub={r.off ? '已停用（历史账户）' : '启用中'} subDanger={r.off} />,
        },
        { title: '渠道', dataIndex: 'provider', width: 108, render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
        {
            title: '主体 / 结算账户',
            dataIndex: 'subject',
            width: 300,
            render: (_: unknown, r) => (
                <Cell main={<span style={{ fontSize: 12 }}>{r.subject}</span>} sub={<span className="biz-mono">{r.acctLabel}</span>} />
            ),
        },
        { title: '状态', dataIndex: 'state', width: 108, render: (v: string) => <BizStatus dict={VOUCHER_ST} value={v} /> },
        {
            title: '凭证链接',
            dataIndex: 'url',
            render: (_: unknown, r) =>
                r.state === 'hit' ? (
                    <span className="biz-mono biz-cell__sub" title={r.url}>
                        {r.url}
                    </span>
                ) : (
                    <span className="biz-dim" style={{ fontSize: 12 }}>
                        {r.text}
                    </span>
                ),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 88 },
    ];

    const actionsOf = (r: Row) => [
        {
            key: 'download',
            label: '下载',
            disabled: r.state !== 'hit',
            onClick: () => downloadVoucher(r.fileName),
        },
    ];
    const { columns: tableColumns } = useActionsColumn(columns, actionsOf);

    return (
        <PageContainer
            title="财务凭证"
            extra={
                <span className="biz-dim" style={{ fontSize: 12 }}>
                    共 {accounts.length} 个出款账户（含停用 {accounts.length - onN} 个）
                </span>
            }
        >
            <StatRules
                items={[
                    '<b>为什么按流水号查，而不是按订单查：</b>财务手里通常只有流水号 —— 银行短信、三方后台、卖家发来的截图。',
                    '<b>为什么必须轮询停用账户：</b>一笔两个月前的出款，当时用的账户可能已经因为费率或主体变更关掉了；只查启用中的账户，这类老单永远查不到凭证。',
                    '<b>「超窗口」不等于没打过</b>：渠道只保留一段时间的凭证，过了就查不到 —— 要凭证只能找渠道单独调档。',
                    '<b>人工线下打款没有渠道凭证</b>：这笔钱从我们自己的银行账户转出，三方后台没有这条记录，只看当时上传的回单。',
                ]}
            />

            <div className="biz-pool" style={{ marginBottom: 14 }}>
                <div className="biz-pool__h">
                    <b style={{ fontSize: 13 }}>按渠道流水号查凭证</b>
                    <span className="biz-dim" style={{ fontSize: 11 }}>
                        {no ? `已检索 ${rows.length} 个出款账户` : `可用流水号试试：${withdrawals.filter((w) => w.tradeNo).map((w) => w.tradeNo).slice(0, 3).join(' / ')}`}
                    </span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                    <Space align="end" wrap>
                        <div style={{ minWidth: 300 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>渠道流水号（必填）</div>
                            <Input
                                value={draft}
                                onChange={setDraft}
                                onEnterPress={search}
                                placeholder="如 CMB2026110311310042"
                                style={{ width: 320 }}
                                showClear
                            />
                        </div>
                        <Button type="primary" theme="solid" onClick={search} loading={isFetching}>
                            查询
                        </Button>
                        {no ? (
                            <Button
                                onClick={() => {
                                    setNo('');
                                    setDraft('');
                                }}
                            >
                                清空
                            </Button>
                        ) : null}
                    </Space>
                    <div className="biz-dim" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.7 }}>
                        查询会遍历<b>全部出款账户</b>，包括已经停用的老账户 —— 很久以前出的款，当时用的账户现在可能已经关了。
                    </div>
                </div>
            </div>

            {no ? (
                <>
                    <div className="biz-pool" style={{ marginBottom: 14 }}>
                        <div className="biz-pool__h">
                            <b style={{ fontSize: 13 }}>查询结果</b>
                            <Tag color={hitN ? 'green' : doc?.payMode === 'offline' ? 'blue' : 'orange'} size="small" style={{ marginLeft: 'auto' }}>
                                {hitN ? `命中 ${hitN}` : doc?.payMode === 'offline' ? '线下打款' : '未取到凭证'}
                            </Tag>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                            {doc ? (
                                <dl className="biz-dl">
                                    <dt>单据</dt>
                                    <dd>
                                        <span className="biz-mono">{doc.code}</span>
                                        <span className="biz-dim"> 关联 {doc.orderCode}</span>
                                    </dd>
                                    <dt>金额</dt>
                                    <dd className="biz-num">¥ {money(doc.amt)}</dd>
                                    <dt>出款时间</dt>
                                    <dd className="biz-num">{doc.doneAt || '—'}</dd>
                                    <dt>到账方式</dt>
                                    <dd>{doc.payMode === 'offline' ? '人工线下打款（无渠道凭证）' : '渠道代付'}</dd>
                                    <dt>累计支出</dt>
                                    <dd className="biz-num">¥ {money0(doc.amt)}</dd>
                                </dl>
                            ) : null}
                            <div className={`biz-calc${hitN || doc?.payMode === 'offline' ? '' : ' biz-calc--bad'}`}>{verdict}</div>
                        </div>
                    </div>

                    {shown.length ? (
                        <Table<Row>
                            {...tableProps}
                            rowKey="acct"
                            columns={tableColumns}
                            dataSource={shown}
                            pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
                            scroll={{ x: tableScrollX(tableColumns) }}
                        />
                    ) : (
                        <div className="biz-calc">本次检索 {rows.length} 个出款账户，全部未命中（该账户没打过这一笔，已折叠）。</div>
                    )}

                    <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.8 }}>
                        本次检索 <b>{rows.length}</b> 个出款账户，其中 <b>{missN}</b> 个未命中（该账户没打过这一笔，已折叠）。
                        <br />
                        <b>「超窗口」不等于没打过</b>：渠道只保留一段时间的凭证，过了就查不到 —— 要凭证只能找渠道单独调档。
                    </div>
                </>
            ) : null}
        </PageContainer>
    );
}

/* 「下载」在表格里由操作列触发：原型不吐 PDF，但要让人看见点了哪一份 */
export function downloadVoucher(fileName: string) {
    if (!fileName) {
        Toast.warning('这个账户没有可下载的凭证');
        return;
    }
    Toast.success(`已开始下载：${fileName}`);
}
