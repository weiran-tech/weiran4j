import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { opsSeed } from '@/mocks/opsSeed';
import { createBizSeed } from '@/mocks/seed-biz';
import OpsUsersPage from '../users/OpsUsersPage';
import OpsOrdersPage from '../orders/OrdersPage';
import { GoodsEditModal } from '../goods/GoodsDialogs';
import type { OpsGoodsRow } from '@/hooks/queries/ops';

const seed = opsSeed();
const bizSeed = createBizSeed();

/** 运营后台路由表：list 返回分页结构 + counts，update / addLog / toOffline / offlinePay 返回 null */
function routes(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [table, rows] of Object.entries(seed)) {
        const resource = table.replace(/^ops/, '').toLowerCase();
        out[`GET /api-backend/ops/${resource}/list`] = (_: unknown, url: URL) => {
            const status = url.searchParams.get('status') ?? '';
            const list = status ? rows.filter((row) => String(row.status) === status) : rows;
            const counts = rows.reduce<Record<string, number>>((acc, row) => {
                const key = String(row.status);
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
            }, {});
            return { list, total: list.length, page: 1, pageSize: 500, counts };
        };
        for (const action of ['update', 'addLog', 'toOffline', 'offlinePay', 'setUserStatus']) {
            for (const id of rows.map((row) => row.id)) {
                out[`PUT /api-backend/ops/${resource}/${action}/${id}`] = null;
            }
        }
    }
    /* 弹窗与详情要读商户后台的账户台账：收款商户来自 bizChannel，出款账户来自
       bizPayoutAccount，主体与账号来自 bizAccount，资金明细读 bizTradeRule。
       这几个接口不打桩的话，选账户的下拉会是空的，测试就测不到真东西。 */
    for (const table of ['bizChannel', 'bizAccount', 'bizPayoutAccount']) {
        out[`GET /api-backend/biz/${table}/listAll`] = bizSeed[table] ?? [];
    }
    out['GET /api-backend/biz/bizTradeRule/get/1'] = (bizSeed.bizTradeRule ?? [])[0];
    return out;
}

afterEach(() => vi.unstubAllGlobals());

describe('用户管理（承接原「用户结算信息」）', () => {
    it('已实名用户有「结算信息」按钮，未实名只有「日志」', async () => {
        mockFetch(routes());
        renderWithProviders(<OpsUsersPage />);
        expect(await screen.findByText('星辰游戏工作室')).toBeInTheDocument();

        // 12 个用户里 11 个已实名 → 11 个「结算信息」按钮；日志每行都有
        expect(screen.getAllByRole('button', { name: '结算信息' })).toHaveLength(11);
        expect(screen.getAllByRole('button', { name: '日志' })).toHaveLength(12);
    });

    it('点「结算信息」打开弹窗：三个页签，银行卡页签给出三方用户 id', async () => {
        mockFetch(routes());
        renderWithProviders(<OpsUsersPage />);
        await screen.findByText('星辰游戏工作室');

        fireEvent.click(screen.getAllByRole('button', { name: '结算信息' })[0]!);
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/结算信息 · 星辰游戏工作室/)).toBeInTheDocument();
        expect(within(dialog).getByText('HFU20250312000412')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: '变更日志' })).toBeInTheDocument();
        expect(within(dialog).getByText(/这一侧只读/)).toBeInTheDocument();
    });

    it('点「日志」直接落在变更日志页签（不落在银行卡）', async () => {
        mockFetch(routes());
        renderWithProviders(<OpsUsersPage />);
        await screen.findByText('星辰游戏工作室');

        fireEvent.click(screen.getAllByRole('button', { name: '日志' })[0]!);
        const dialog = await screen.findByRole('dialog');
        // 日志页签被选中，且首屏不再是银行卡的「绑卡流程」
        expect(within(dialog).getByRole('button', { name: '变更日志' }).className).toContain('biz-tabs__item--on');
        expect(within(dialog).queryByText('绑卡流程')).toBeNull();
    });
});

describe('订单管理（承接原订单类型 / 转线下单 / 登记打款）', () => {
    it('「订单类型」列只有渠道单 / 线下单两个枚举值，不挂打款进度', async () => {
        mockFetch(routes());
        renderWithProviders(<OpsOrdersPage />);
        expect(await screen.findByRole('columnheader', { name: '订单类型' })).toBeInTheDocument();
        expect(await screen.findByText('AL20261020000868')).toBeInTheDocument();

        expect(screen.getAllByText('渠道单').length).toBeGreaterThan(0);
        expect(screen.getAllByText('线下单').length).toBeGreaterThan(0);
        // 打款进度不进类型列：这三个词一个都不该出现在页面上
        expect(screen.queryByText('待传凭证')).toBeNull();
        expect(screen.queryByText('待登记打款')).toBeNull();
        expect(screen.queryByText('已线下打款')).toBeNull();
    });

    it('待支付的渠道单给「转线下单」，已收货的线下单给「登记打款」', async () => {
        const mocked = mockFetch(routes());
        renderWithProviders(<OpsOrdersPage />);
        await screen.findByText('AL20261020000868');

        // 转线下单：只有「待支付 + 渠道单」才有（种子 1 条：AL20261020000868）
        expect(screen.getAllByRole('button', { name: '转线下单' }).length).toBe(1);
        // 登记打款：线下单 + 已收货 + 未打款（order 17 / 18 / 3 / 11，共 4 条）
        expect(screen.getAllByRole('button', { name: '登记打款' }).length).toBe(4);

        // 转线下单改成弹窗：要选收款商户，不选不让提交
        fireEvent.click(screen.getAllByRole('button', { name: '转线下单' })[0]!);
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/转线下单/)).toBeInTheDocument();

        // 未选收款商户时提交被拦下，不发请求
        fireEvent.click(within(dialog).getByRole('button', { name: '确认转为线下单' }));
        await waitFor(() => expect(mocked.calls.some((c) => c.path.includes('/ops/order/toOffline/'))).toBe(false));
        expect(within(dialog).getByText('请选择收款商户')).toBeInTheDocument();

        // 选一条渠道后再提交，但凭证还没填 —— 仍被拦
        fireEvent.click(within(dialog).getByText('选择这笔钱进哪条渠道'));
        const option = await screen.findByText(/汇付微信01/);
        fireEvent.click(option);
        fireEvent.click(within(dialog).getByRole('button', { name: '确认转为线下单' }));
        await waitFor(() => expect(within(dialog).getByText('请填写用户付款凭证')).toBeInTheDocument());

        // 补上凭证 / 实收金额 / 支付时间（三项都是转线下的必填）
        fireEvent.change(within(dialog).getByPlaceholderText(/买家微信转账截图/), {
            target: { value: '转账截图.jpg' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: '确认转为线下单' }));

        await waitFor(() => {
            const call = mocked.calls.find((c) => c.path.includes('/ops/order/toOffline/'));
            expect(call?.body).toMatchObject({
                recvChannel: 'MC001',
                proof: '转账截图.jpg',
                amt: 12800,
            });
        });
    });

    it('已收货的渠道单不给「登记打款」—— 线下单专属', async () => {
        // order 5 是「已收货 + 渠道单」，不能出现打款入口；它和 4 条线下单的区别只在 orderType
        const calls = routes();
        mockFetch(calls);
        renderWithProviders(<OpsOrdersPage />);
        await screen.findByText('AL20261020000867');

        const row = screen.getByText('AL20261020000867').closest('tr') as HTMLElement;
        expect(within(row).queryByRole('button', { name: '登记打款' })).toBeNull();
    });

    it('登记打款：必填校验，填完提交 offlinePay', async () => {
        const mocked = mockFetch(routes());
        renderWithProviders(<OpsOrdersPage />);
        await screen.findByText('AL20261020000868');

        fireEvent.click(screen.getAllByRole('button', { name: '登记打款' })[0]!);
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/登记打款/)).toBeInTheDocument();

        // 用函数匹配器避开正则里的斜杠转义
        const byPlaceholder = (keyword: string) => (_: string, el: Element | null) =>
            Boolean(el?.getAttribute('placeholder')?.includes(keyword));

        // 第一行是 order 17：上次已记流水号、凭证还没传，弹窗要把流水号带出来并提示还差凭证
        const noInput = within(dialog).getByPlaceholderText<HTMLInputElement>(byPlaceholder('流水号'));
        expect(noInput.value).toBe('CMB202610221630114');
        expect(within(dialog).getByText(/待补：到账凭证/)).toBeInTheDocument();

        // 缺凭证时直接提交不会发请求
        fireEvent.click(within(dialog).getByRole('button', { name: '确认已打款' }));
        await waitFor(() => expect(mocked.calls.some((c) => c.path.includes('offlinePay'))).toBe(false));

        fireEvent.change(within(dialog).getByPlaceholderText(byPlaceholder('流水号')), {
            target: { value: 'CMB202611101200001' },
        });
        fireEvent.change(within(dialog).getByPlaceholderText(byPlaceholder('凭证')), { target: { value: '凭证.jpg' } });

        // 填完凭证但没选出款账户，仍被拦下 —— 钱从哪个号打出去必须记下来
        fireEvent.click(within(dialog).getByRole('button', { name: '确认已打款' }));
        await waitFor(() => expect(mocked.calls.some((c) => c.path.includes('offlinePay'))).toBe(false));
        expect(within(dialog).getByText('请选择出款账户')).toBeInTheDocument();

        // 选一条出款账户后提交
        fireEvent.click(within(dialog).getByText('选择这笔钱从哪个账户打出'));
        const payoutOption = await screen.findByText(/银行卡出款主用/);
        fireEvent.click(payoutOption);
        fireEvent.click(within(dialog).getByRole('button', { name: '确认已打款' }));

        await waitFor(() => {
            const call = mocked.calls.find((c) => c.path.includes('offlinePay'));
            expect(call?.body).toMatchObject({ no: 'CMB202611101200001', proof: '凭证.jpg', payoutAcct: 'PA001' });
        });
    });
});

describe('商品管理 · 编辑弹窗的包赔费', () => {
    const goodsOf = (code: string) => (seed.opsGoods ?? []).find((g) => g.code === code) as unknown as OpsGoodsRow;
    const noop = () => undefined;

    it('没勾免收：按交易规则算，¥12,800 的号封在最高 ¥1,000', async () => {
        mockFetch(routes());
        renderWithProviders(<GoodsEditModal row={goodsOf('SP20261021-0136')} users={[]} onClose={noop} />);
        const dialog = await screen.findByRole('dialog');
        // 规则来源写在金额旁边：改费率去交易规则页，这里只读
        expect(await within(dialog).findByText(/交易规则 10%（最低 ¥10\.00，最高 ¥1,000\.00）/)).toBeInTheDocument();
        expect(within(dialog).getByText('¥1,000.00')).toBeInTheDocument();
        expect(within(dialog).getByText('¥13,800.00')).toBeInTheDocument();
    });

    it('勾了免收：包赔费为 0，买家实付等于售价', async () => {
        mockFetch(routes());
        // 种子里 5 号商品（¥2,100）勾了「免收」，其余都按费率走
        renderWithProviders(<GoodsEditModal row={goodsOf('SP20261020-0133')} users={[]} onClose={noop} />);
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('本商品免收，不走全局费率')).toBeInTheDocument();
        expect(within(dialog).getByText('¥0.00')).toBeInTheDocument();
    });

    it('取消勾选后立刻按全局费率计价', async () => {
        mockFetch(routes());
        renderWithProviders(<GoodsEditModal row={goodsOf('SP20261020-0133')} users={[]} onClose={noop} />);
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(await within(dialog).findByRole('switch'));
        expect(await within(dialog).findByText(/交易规则 10%/)).toBeInTheDocument();
        // ¥2,100 × 10% = ¥210，落在 ¥10–¥1,000 之间，上下限都不动它
        expect(within(dialog).getByText('¥210.00')).toBeInTheDocument();
    });

    it('保存时把免收勾选一并提交，并在操作记录里写明改成了什么', async () => {
        const mocked = mockFetch(routes());
        renderWithProviders(<GoodsEditModal row={goodsOf('SP20261021-0137')} users={[]} onClose={noop} />);
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(await within(dialog).findByRole('switch'));
        fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));
        await waitFor(() => {
            const call = mocked.calls.find((c) => c.path.includes('/goods/update/'));
            expect(call?.body).toMatchObject({ guarFree: true });
        });
        await waitFor(() => {
            const log = mocked.calls.find((c) => c.path.includes('/goods/addLog/'));
            expect(log?.body).toMatchObject({ remark: '修改：免收包赔费（免收包赔费 = 是）' });
        });
    });
});
