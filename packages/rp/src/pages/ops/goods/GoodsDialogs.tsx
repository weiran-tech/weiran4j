import { Button, Input, InputNumber, Modal, Select, Space, Switch, Toast } from '@douyinfe/semi-ui';
import { useState, type ReactNode } from 'react';
import { feeOf } from '@/biz/biz-dict';
import { useTradeRule } from '@/hooks/queries/biz';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsGoodsRow, OpsUserRow } from '@/hooks/queries/ops';
import type { BizTradeRuleView } from '@/types/biz';
import { money } from '../ops';
import { ChannelSelect } from '../account-picker';

const GAMES = ['和平精英', '王者荣耀', '穿越火线', '使命召唤手游', '英雄联盟手游', '三角洲行动'];
const PRICE_MAX = 99999999;

/** 弹窗里的表单字段外壳 */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>{label}</div>
            {children}
            {hint && <div className="ops-form-hint">{hint}</div>}
        </div>
    );
}

function ErrorText({ message }: { message: string }) {
    return message ? <div className="ops-form-error">{message}</div> : null;
}

/** 把全局包赔费率翻译成一句人话：多少百分比、上下限各多少 */
function guarRuleText(rule: BizTradeRuleView['guar'] | undefined): string {
    if (!rule) return '交易规则还没读到';
    const pct = Number(rule.feePct) || 0;
    const min = Number(rule.feeMin) || 0;
    const max = Number(rule.feeMax) || 0;
    if (!pct && !min && !max) return '交易规则当前不收包赔费';
    const caps = [min > 0 ? `最低 ${money(min)}` : '', max > 0 ? `最高 ${money(max)}` : ''].filter(Boolean);
    return `交易规则 ${pct}%${caps.length ? `（${caps.join('，')}）` : ''}`;
}

/** 编辑商品：后台来源可改用户ID，用户来源不可改 */
export function GoodsEditModal({ row, users, onClose }: { row: OpsGoodsRow; users: OpsUserRow[]; onClose: () => void }) {
    const action = useOpsAction('goods');
    /* 包赔费不在商品上单独定价，读「交易规则 → 包赔费」那一份全局配置：
       费率一改，所有没勾免收的商品跟着变，不用逐个商品改价。 */
    const { data: tradeRule } = useTradeRule<BizTradeRuleView>();
    const [title, setTitle] = useState(row.title);
    const [userId, setUserId] = useState(row.userId);
    const [game, setGame] = useState(row.game);
    const [channel, setChannel] = useState(row.channel);
    const [region, setRegion] = useState(row.region);
    const [server, setServer] = useState(row.server);
    const [account, setAccount] = useState(row.account);
    const [price, setPrice] = useState<number | ''>(row.price);
    const [guarFree, setGuarFree] = useState(row.guarFree === true);
    const [error, setError] = useState('');

    const priceValue = Number(price) || 0;
    const guarFee = guarFree ? 0 : feeOf(priceValue, tradeRule?.guar);
    const buyerPay = +(priceValue + guarFee).toFixed(2);

    const submit = async () => {
        const priceValue = Number(price);
        if (!title.trim()) return setError('请输入商品标题');
        if (!channel.trim() || !region.trim() || !server.trim()) return setError('渠道 / 大区 / 服务器 均不能为空');
        if (!account.trim()) return setError('请输入游戏账号');
        if (!priceValue || priceValue <= 0) return setError('请输入正确的售价');
        if (priceValue > PRICE_MAX) return setError(`售价不能超过 ${PRICE_MAX.toLocaleString('zh-CN')} 元`);
        if (row.source === '后台' && userId.trim()) {
            if (!/^\d{6,}$/.test(userId.trim())) return setError('用户ID 格式不正确（至少 6 位数字）');
            if (!users.some((user) => user.uid === userId.trim())) return setError('未找到该用户ID 对应的用户');
        }
        const body = {
            title: title.trim(),
            userId: userId.trim(),
            game,
            channel: channel.trim(),
            region: region.trim(),
            server: server.trim(),
            account: account.trim(),
            price: priceValue,
            guarFree,
        };
        const labels: Record<string, string> = {
            title: '商品标题',
            price: '售价',
            game: '游戏',
            channel: '渠道',
            region: '大区',
            server: '服务器',
            account: '游戏账号',
            userId: '用户ID',
            guarFree: '免收包赔费',
        };
        /* guarFree 在旧数据里可能是 undefined，直接 String() 会得到 'undefined'，
           于是「没动过」也会被记成一次修改 —— 统一按布尔值比较。
           其余字段只可能是字符串 / 数字，logs 这类数组不参与比较。 */
        const before = (key: string): string => {
            if (key === 'guarFree') return String(row.guarFree === true);
            const current = row[key as keyof OpsGoodsRow];
            return typeof current === 'string' || typeof current === 'number' ? String(current) : '';
        };
        const changed = Object.entries(body)
            .filter(([key, value]) => before(key) !== String(value))
            .map(([key]) => labels[key] ?? key);
        if (!changed.length) {
            Toast.info('商品信息无变化');
            onClose();
            return;
        }
        await action.mutateAsync({ action: 'update', id: row.id, body });
        await action.mutateAsync({
            action: 'addLog',
            id: row.id,
            body: {
                actionName: '编辑商品',
                remark: `修改：${changed.join('、')}` +
                    (changed.includes('免收包赔费') ? `（免收包赔费 = ${guarFree ? '是' : '否'}）` : ''),
            },
        });
        Toast.success('商品信息已更新');
        onClose();
    };

    return (
        <Modal
            visible
            title="编辑商品"
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
            <Field label="商品编号">
                <Input value={row.code} disabled />
            </Field>
            <Field label="商品标题">
                <Input value={title} onChange={setTitle} placeholder="请输入商品标题" showClear />
            </Field>
            <Field label="来源">
                <Input value={row.source} disabled />
            </Field>
            <Field label={row.source === '后台' ? '用户ID（可手动指定，可留空）' : '用户ID（用户来源不可修改）'}>
                <Input
                    value={userId}
                    onChange={setUserId}
                    placeholder="请输入用户ID"
                    disabled={row.source !== '后台'}
                    showClear
                />
            </Field>
            <Field label="游戏">
                <Select
                    value={game}
                    onChange={(value) => setGame(String(value))}
                    optionList={GAMES.map((item) => ({ label: item, value: item }))}
                    style={{ width: '100%' }}
                />
            </Field>
            <Field label="渠道 / 大区 / 服务器">
                <div className="ops-form-row">
                    <Input value={channel} onChange={setChannel} placeholder="渠道" showClear />
                    <Input value={region} onChange={setRegion} placeholder="大区" showClear />
                    <Input value={server} onChange={setServer} placeholder="服务器" showClear />
                </div>
            </Field>
            <Field label="游戏账号">
                <Input value={account} onChange={setAccount} placeholder="请输入游戏账号" showClear />
            </Field>
            <Field label={`售价（最高 ${PRICE_MAX.toLocaleString('zh-CN')} 元）`}>
                <InputNumber
                    value={price}
                    min={0.01}
                    max={PRICE_MAX}
                    precision={2}
                    style={{ width: '100%' }}
                    onChange={(value) => setPrice(typeof value === 'number' ? value : '')}
                />
            </Field>
            {/* 包赔费的三个数（费率 / 最低 / 最高）在「交易规则」里配，这里只读数、只允许单个商品免收：
                否则同一个费率散落在几千个商品上，改一次要清一遍库。 */}
            <Field
                label="包赔费"
                hint="按「交易规则 → 包赔费」计算（改费率去交易规则页）；勾「免收包赔费」只对本商品生效"
            >
                <div className="ops-money-box" style={{ padding: '2px 12px', background: 'var(--semi-color-fill-0)' }}>
                    <div className="ops-money-row">
                        <span className="ops-sub">
                            包赔费
                            <span style={{ display: 'block', fontSize: 11 }}>
                                {guarFree ? '本商品免收，不走全局费率' : guarRuleText(tradeRule?.guar)}
                            </span>
                        </span>
                        <span className="ops-money">
                            {priceValue > 0 ? money(guarFee) : '—'}
                        </span>
                    </div>
                    <div className="ops-money-row ops-money-row--total">
                        <span>
                            买家实付
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 400 }}>
                                售价 {priceValue > 0 ? money(priceValue) : '—'} + 包赔费
                            </span>
                        </span>
                        <span className="ops-money">{priceValue > 0 ? money(buyerPay) : '—'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <Switch checked={guarFree} onChange={(value) => setGuarFree(Boolean(value))} />
                    <span style={{ fontSize: 13 }}>免收包赔费</span>
                    <span className="ops-form-hint" style={{ marginTop: 0 }}>
                        {guarFree ? '买家实付 = 售价，这一单不收包赔费' : '不勾选则按全局费率向买家收'}
                    </span>
                </div>
            </Field>
            <ErrorText message={error} />
        </Modal>
    );
}

/** 支付（后台代下单）：校验买家存在、未封禁、且不能是卖家本人 */
export function GoodsPayModal({ row, users, onClose }: { row: OpsGoodsRow; users: OpsUserRow[]; onClose: () => void }) {
    const action = useOpsAction('goods');
    const [buyerUid, setBuyerUid] = useState('');
    const [payChannel, setPayChannel] = useState('');
    const [error, setError] = useState('');
    const seller = users.find((user) => user.uid === row.userId);

    const submit = async () => {
        const value = buyerUid.trim();
        if (!value) return setError('请输入买家ID');
        if (!/^\d{6,}$/.test(value)) return setError('买家ID 格式不正确（至少 6 位数字）');
        const buyer = users.find((user) => user.uid === value);
        if (!buyer) return setError('未找到该买家ID 对应的用户');
        if (buyer.status === '封禁') return setError('该买家账号已封禁，无法支付');
        if (row.userId && row.userId === value) return setError('买家不能与卖家为同一用户');
        // 收款商户必选：钱从哪条路进来是这一笔支付的一部分，事后再补就说不清是哪条渠道收的
        if (!payChannel) return setError('请选择收款商户');
        await action.mutateAsync({
            action: 'pay',
            id: row.id,
            body: {
                buyerUid: value,
                payChannel,
                remark: `买家 ${buyer.nickname}（${value}）支付 ${money(row.price)}，收款商户 ${payChannel}，商品置为已售出`,
            },
        });
        Toast.success(`支付成功，商品已售出给 ${buyer.nickname}`);
        onClose();
    };

    return (
        <Modal
            visible
            title="支付"
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        确认支付
                    </Button>
                </Space>
            }
        >
            <Field label="商品编号">
                <Input value={row.code} disabled />
            </Field>
            <Field label="商品标题">
                <Input value={row.title} disabled />
            </Field>
            <Field label="卖家">
                <Input value={seller ? `${seller.nickname}（${seller.uid}）` : '后台来源（无卖家）'} disabled />
            </Field>
            <Field label="支付金额">
                <Input value={money(row.price)} disabled />
            </Field>
            <Field label="买家ID">
                <Input value={buyerUid} onChange={setBuyerUid} placeholder="请输入买家用户ID" showClear />
            </Field>
            <ChannelSelect
                value={payChannel}
                onChange={setPayChannel}
                hint="这笔钱走哪条渠道进来。只列线上渠道 —— 支付要过收银台，线下渠道收不了这一笔。"
                filterOffline={false}
            />
            <ErrorText message={error} />
        </Modal>
    );
}

/** 设置卖家：后台来源商品可按用户ID / 展示ID / 手机号绑定卖家 */
export function GoodsSellerModal({ row, users, onClose }: { row: OpsGoodsRow; users: OpsUserRow[]; onClose: () => void }) {
    const action = useOpsAction('goods');
    const [keyword, setKeyword] = useState('');
    const [error, setError] = useState('');

    const submit = async () => {
        const query = keyword.trim().replace(/\s/g, '');
        if (!query) return setError('请输入手机号或用户ID');
        const hit = users.filter(
            (user) =>
                user.uid === query ||
                user.displayId.toLowerCase() === query.toLowerCase() ||
                user.phone === query,
        );
        if (!hit.length) return setError('未找到匹配的用户，请核对手机号或用户ID');
        if (hit.length > 1) return setError(`匹配到 ${hit.length} 位用户，请输入完整用户ID`);
        const user = hit[0]!;
        await action.mutateAsync({
            action: 'assignSeller',
            id: row.id,
            body: {
                userId: user.uid,
                remark: `绑定卖家 ${user.nickname}（${user.uid}），来源仍为「${row.source}」`,
            },
        });
        Toast.success(`已绑定卖家 ${user.nickname}（${user.uid}）`);
        onClose();
    };

    return (
        <Modal
            visible
            title="设置卖家"
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        绑定卖家
                    </Button>
                </Space>
            }
        >
            <Field label="商品编号">
                <Input value={row.code} disabled />
            </Field>
            <Field label="商品标题">
                <Input value={row.title} disabled />
            </Field>
            <Field label="游戏区服">
                <Input value={`${row.game} / ${row.channel} / ${row.region} / ${row.server}`} disabled />
            </Field>
            <Field label="手机号 / 用户ID" hint="支持用户ID（如 100238）、展示ID（如 U100238）或手机号（可含 * 掩码）。">
                <Input value={keyword} onChange={setKeyword} placeholder="请输入卖家手机号或用户ID" showClear />
            </Field>
            <ErrorText message={error} />
        </Modal>
    );
}
