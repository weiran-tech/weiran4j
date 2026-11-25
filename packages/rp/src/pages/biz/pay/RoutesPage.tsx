import { Button, InputNumber, Modal, Space, Tag, Toast } from '@douyinfe/semi-ui';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { POOL_NAMES, acctOk, poolOfWay, wayName } from '@/biz/biz-dict';
import { useBizRows, useBizUpdate } from '@/hooks/queries/biz';
import type { BizAccountView, BizChannelView } from '@/types/biz';
import { Field } from '../orders/OrdersModals';
import { StatRules } from '../shared';

/** 占比分段配色：与 Tag 的语义色一致，深浅交替便于区分相邻段 */
const SEG_COLORS = ['#0064fa', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#0ea5e9', '#84cc16'];

/** 权重 → 占比：与落库同一套算法（四舍五入），不出现「弹窗 27%、回来 28%」 */
function pctOf(weight: number, others: number[]): number {
    const sum = others.reduce((s, x) => s + x, 0) + weight;
    return sum ? Math.round((weight / sum) * 100) : 0;
}

export default function RoutesPage() {
    const { data: channels = [], isFetching } = useBizRows<BizChannelView>('bizChannel');
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const update = useBizUpdate<BizChannelView>('bizChannel');
    const [editing, setEditing] = useState<BizChannelView | null>(null);
    const [draftWeight, setDraftWeight] = useState<number>(100);

    /* 成员由「收款商户」的开关 + 账户状态共同决定：账户异常 / 冻结时开了也收不了钱，
       所以这里必须读账户，不能只看开关。线下渠道不过收银台，不进任何池。 */
    const acctOf = (code: string) => accounts.find((a) => a.code === code);
    const on = (c: BizChannelView) => c.on && c.online && acctOk(acctOf(c.acct) ?? { normal: true, frozen: false });
    const live = channels.filter(on);
    /** 池单元格里的「主体」来自账户，不再来自旧的主体台账 */
    const entityName = (code: string) => acctOf(code)?.subject ?? '—';

    /** 池子：微信、支付宝两个大池 + 专有渠道各自成池，顺序固定，便于两两对照 */
    const pools = useMemo(() => {
        const keys = new Set<string>();
        live.forEach((c) => c.ways.forEach((w) => keys.add(poolOfWay(w))));
        const order = ['wx', 'ali'];
        return [...keys].sort((a, b) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        });
    }, [live]);

    const poolChannels = (pool: string) =>
        live
            .filter((c) => c.ways.some((w) => poolOfWay(w) === pool))
            .slice()
            .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0));

    const poolName = (k: string) => POOL_NAMES[k] ?? `${wayName(k)}池`;
    const multiPools = pools.filter((p) => poolChannels(p).length > 1);


    const openWeight = (c: BizChannelView) => {
        setEditing(c);
        setDraftWeight(Number(c.weight) || 100);
    };

    const save = () => {
        if (!editing) return;
        if (!(draftWeight >= 1) || draftWeight > 1000) {
            Toast.warning('权重填 1–1000 的整数');
            return;
        }
        update.mutate(
            { id: editing.id, body: { weight: draftWeight } },
            {
                onSuccess: () => {
                    Toast.success(`${editing.alias} 权重已改为 ${draftWeight}`);
                    setEditing(null);
                },
            },
        );
    };

    /** 弹窗里的实时占比：列出它所在每个池子的承接比例 */
    const preview = (c: BizChannelView, w: number) => {
        const ownPools = [...new Set(c.ways.map((x) => poolOfWay(x)).filter(Boolean))];
        return ownPools.map((p) => {
            const others = poolChannels(p).filter((x) => x.id !== c.id).map((x) => Number(x.weight) || 0);
            if (!others.length) return `「${poolName(p)}」池里只有这一条渠道 —— 100% 走它，调权重不改变结果。`;
            const pct = pctOf(w, others);
            const sum = others.reduce((s, x) => s + x, 0) + w;
            return `「${poolName(p)}」：承接 ${pct}%（${w} ÷ ${sum}，池内其他合计 ${sum - w}）`;
        });
    };

    return (
        <PageContainer
            title="路由分流"
            extra={<span className="biz-dim" style={{ fontSize: 12 }}>只调权重 · 加入 / 移出在「收款商户」的账号交易开关上</span>}
        >
            <div className="biz-dim" style={{ fontSize: 12, marginBottom: 10 }}>
                共 <b>{pools.length}</b> 个池子（{live.length} 条渠道在用），其中 <b>{multiPools.length}</b> 个是多渠道（需要调权重）；
                单渠道的池子 100% 走它，不用配。
            </div>

            <StatRules
                items={[
                    <>
                        <b>权重按「渠道」算，池子按「支付方式」分。</b>一笔微信付款只看「微信池」，一笔支付宝付款只看「支付宝池」；
                        同一批渠道如果是汇付 + 易宝，在微信池里可能是 6 : 4、在支付宝池里 8 : 2 —— <b>权重是一个数，两个池各自当分母</b>。
                    </>,
                    <>
                        <b>权重不是百分比，是比值。</b>各自填 1–1000（新建默认 100），承接占比 = 本条权重 ÷ 同一池子权重之和。
                    </>,
                    <>
                        <b>开关即入池。</b>渠道的「账号交易开关」打开就进池，关掉就出池 —— 这一页不做加入 / 移出。
                    </>,
                    <>
                        <b>分流只决定「这一笔走哪条」，不拆钱。</b>一笔收款整笔落到一条渠道，不影响结算比例、也不影响退款路径。
                    </>,
                ]}
            />

            {!pools.length ? (
                <div className="biz-calc">
                    <b>还没有开启的收款渠道。</b>没有渠道就没有池子可分配 —— 先去「收款商户 · 收款渠道」把某条渠道的账号交易开关打开，它就会自动进池。
                </div>
            ) : null}

            {pools.map((pool) => {
                const list = poolChannels(pool);
                const sum = list.reduce((s, c) => s + (Number(c.weight) || 0), 0);
                const ways = [...new Set(list.flatMap((c) => c.ways.filter((w) => poolOfWay(w) === pool)))];
                return (
                    <div className="biz-pool" key={pool}>
                        <div className="biz-pool__h">
                            <Tag color={pool === 'wx' ? 'green' : pool === 'ali' ? 'blue' : 'grey'} size="small">
                                {POOL_NAMES[pool] ?? '专有渠道'}
                            </Tag>
                            <b style={{ fontSize: 13 }}>{POOL_NAMES[pool] ? '收款池' : poolName(pool)}</b>
                            <span className="biz-dim" style={{ fontSize: 11 }}>
                                {ways.map(wayName).join(' / ')}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: 11 }} className="biz-dim">
                                合计权重 <b className="biz-num">{sum}</b> · {list.length} 条渠道
                            </span>
                        </div>
                        <div className="biz-pool__bar">
                            {list.map((c, i) => {
                                const pct = sum ? Math.round(((Number(c.weight) || 0) / sum) * 100) : 0;
                                return (
                                    <span
                                        key={c.code}
                                        className="biz-pool__seg"
                                        style={{ width: `${pct}%`, background: SEG_COLORS[i % SEG_COLORS.length] }}
                                        title={`${c.alias} 承接 ${pct}% 的${poolName(pool)}交易`}
                                    >
                                        {pct >= 8 ? `${pct}%` : ''}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="biz-pool__row biz-pool__th">
                            <span>渠道</span>
                            <span>主体 / 这个池里用的方式</span>
                            <span style={{ textAlign: 'center' }}>权重</span>
                            <span style={{ textAlign: 'right' }}>占比</span>
                            <span style={{ textAlign: 'center' }}>操作</span>
                        </div>
                        {list.map((c, i) => {
                            const pct = sum ? Math.round(((Number(c.weight) || 0) / sum) * 100) : 0;
                            return (
                                <div className="biz-pool__row" key={c.code}>
                                    <span>
                                        <b style={{ fontWeight: 600 }}>
                                            <i
                                                style={{
                                                    display: 'inline-block',
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    marginRight: 6,
                                                    background: SEG_COLORS[i % SEG_COLORS.length],
                                                }}
                                            />
                                            {c.alias}
                                        </b>
                                        <span className="biz-cell__sub">
                                            {c.dock === 'third' ? c.third : wayName(c.ways[0] ?? '')}
                                        </span>
                                    </span>
                                    <span>
                                        <span className="biz-cell__main" style={{ fontSize: 12 }}>
                                            {entityName(c.acct)}
                                        </span>
                                        <span className="biz-cell__sub">
                                            {c.ways.filter((w) => poolOfWay(w) === pool).map(wayName).join(' / ')}
                                        </span>
                                    </span>
                                    <span style={{ textAlign: 'center' }}>
                                        <Button size="small" theme="borderless" onClick={() => openWeight(c)}>
                                            {c.weight}
                                        </Button>
                                    </span>
                                    <span style={{ textAlign: 'right' }} className="biz-num">
                                        {pct}%
                                    </span>
                                    <span style={{ textAlign: 'center' }}>
                                        <Button size="small" theme="borderless" onClick={() => openWeight(c)}>
                                            调整
                                        </Button>
                                    </span>
                                </div>
                            );
                        })}
                        <div className="biz-pool__foot">
                            {list.length === 1 ? '池里只有这一条 —— 全部走它，不抽签' : '按权重随机命中一条 —— 想改比例点右侧「调整」'}
                        </div>
                    </div>
                );
            })}

            <div className="biz-dim" style={{ fontSize: 12, lineHeight: 1.9 }}>
                <b>出款不分流。</b>出款账户改成每种到账方式只启用一条，一次提现整笔走那一个账户，没有权重可调。
                {isFetching ? ' （刷新中…）' : ''}
            </div>

            {editing ? (
                <Modal
                    title={`调整权重 · ${editing.alias}`}
                    visible
                    width={560}
                    onCancel={() => setEditing(null)}
                    footer={
                        <Space>
                            <Button onClick={() => setEditing(null)}>取消</Button>
                            <Button type="primary" theme="solid" loading={update.isPending} onClick={save}>
                                保存
                            </Button>
                        </Space>
                    }
                >
                    <div className="biz-dim" style={{ fontSize: 12, marginBottom: 12 }}>
                        {entityName(editing.acct)} · 当前权重 {editing.weight}
                    </div>
                    <Field label="权重（1–1000）">
                        <InputNumber
                            value={draftWeight}
                            min={1}
                            max={1000}
                            precision={0}
                            style={{ width: '100%' }}
                            onChange={(v) => setDraftWeight(typeof v === 'number' ? v : 1)}
                        />
                    </Field>
                    <div className="biz-calc">
                        {preview(editing, draftWeight).map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                    <div className="biz-calc">
                        一条渠道可以同时在两个池子里（微信一个、支付宝一个），<b>权重是同一个数，但两个池子各自当分母</b>。
                    </div>
                </Modal>
            ) : null}
        </PageContainer>
    );
}
