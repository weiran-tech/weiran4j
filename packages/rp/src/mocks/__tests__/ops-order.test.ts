import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../transport';
import { signIn } from '@/test/session';
import type { OpsOrderRow } from '@/hooks/queries/ops';

vi.unmock('@/mocks/transport');

/**
 * 线下单的两条业务规则（用户口径）：
 *
 * 1. 来源有两种 —— 待支付的渠道单可「转线下单」，或本身就是线下单；
 * 2. 买家「已收货」后才可以「登记打款」，打款登记完成即把订单推到「已完成」。
 *
 * 这两条是状态机的关键，页面断言测不到（页面用的是桩化 fetch），
 * 所以这里直接打真实传输层，盯住状态字段怎么变。
 */
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await mockFetch(`/api-backend/ops/${path}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = (await response.json()) as { code: number; message: string; data: T };
    expect(result.code, result.message).toBe(0);
    return result.data;
}

/** 按单号取一行（种子里的线下单） */
async function orderOf(code: string): Promise<OpsOrderRow> {
    const list = await call<{ list: OpsOrderRow[] }>('order/list?page=1&pageSize=500');
    const row = list.list.find((item) => item.code === code);
    expect(row, `未找到订单 ${code}`).toBeDefined();
    return row as OpsOrderRow;
}

beforeEach(() => {
    localStorage.clear();
    signIn();
});

describe('线下单：状态流转', () => {
    it('种子里的待打款线下单一律停在「已收货」，不是「已完成」', async () => {
        for (const code of ['AL20261022000873', 'AL20261022000874', 'AL20261020000869', 'AL20261018000861']) {
            const row = await orderOf(code);
            expect(row.orderType, code).toBe('线下单');
            expect(row.status, code).toBe('已收货');
            expect(row.offlinePay?.state, code).toBe('todo');
            // 还没完成就不该有交易完成时间
            expect(row.doneAt, code).toBe('');
        }
    });

    it('已打款的那单停在「已完成」，完成时间等于打款时间', async () => {
        const row = await orderOf('AL20261018000859');
        expect(row.status).toBe('已完成');
        expect(row.offlinePay?.state).toBe('done');
        expect(row.doneAt).toBe(row.offlinePay?.at);
    });

    it('登记打款把订单从「已收货」推到「已完成」', async () => {
        const before = await orderOf('AL20261022000874');
        expect(before.status).toBe('已收货');

        await call(`order/offlinePay/${before.id}`, 'PUT', {
            no: 'CMB202611111015001',
            at: '2026-11-11 10:15',
            proof: '打款凭证-AL20261022000874.jpg',
            by: '运营-财务',
        });

        const after = await orderOf('AL20261022000874');
        expect(after.status).toBe('已完成');
        expect(after.doneAt).toBe('2026-11-11 10:15');
        expect(after.offlinePay).toMatchObject({ state: 'done', no: 'CMB202611111015001' });
        // 状态变更要留痕，运营复查时有据可查
        expect(after.logs.some((log) => log.action === '登记打款')).toBe(true);
    });

    it('转线下单：待支付渠道单 → 已支付的线下单，且打款待办', async () => {
        const before = await orderOf('AL20261020000868');
        expect(before.orderType).toBe('渠道单');
        expect(before.status).toBe('待支付');

        await call(`order/toOffline/${before.id}`, 'PUT', {});

        const after = await orderOf('AL20261020000868');
        expect(after.orderType).toBe('线下单');
        // 转线下只是改了收款方式，钱还没到，所以停在「已支付」而不是「已收货」
        expect(after.status).toBe('已支付');
        expect(after.offlinePay?.state).toBe('todo');
        expect(after.logs.some((log) => log.action === '转线下单')).toBe(true);
    });
});

/**
 * 账户引用：三处操作都要把钱「从哪儿进、从哪儿出」记在单上。
 *
 * 运营后台原来只记「打款流水号 + 凭证」，没记出款账户，也没记收款渠道 ——
 * 事后要回答「这笔钱进了哪条渠道、从哪个号打出去的」，只能靠人回忆。
 */
describe('线下单：账户引用', () => {
    it('种子里的订单都带收款渠道；已完成的带出款账户', async () => {
        const list = await call<{ list: OpsOrderRow[] }>('order/list?page=1&pageSize=500');
        for (const row of list.list) {
            expect(row.recvChannel, row.code).toBeTruthy();
        }
        // 已打款的那条（order 13）应该有出款账户
        const paid = list.list.find((r) => r.code === 'AL20261018000859');
        expect(paid?.payoutAcct).toBe('PA001');
    });

    it('转线下单把收款渠道写进订单', async () => {
        const before = await orderOf('AL20261020000868');
        expect(before.orderType).toBe('渠道单');

        await call(`order/toOffline/${before.id}`, 'PUT', { recvChannel: 'MC007' });

        const after = await orderOf('AL20261020000868');
        expect(after.orderType).toBe('线下单');
        expect(after.recvChannel).toBe('MC007');
    });

    it('登记打款把出款账户写进订单', async () => {
        const before = await orderOf('AL20261022000874');
        expect(before.status).toBe('已收货');

        await call(`order/offlinePay/${before.id}`, 'PUT', {
            no: 'CMB202611111015002',
            at: '2026-11-16 22:40',
            proof: '凭证.jpg',
            by: '运营-财务',
            payoutAcct: 'PA003',
        });

        const after = await orderOf('AL20261022000874');
        expect(after.payoutAcct).toBe('PA003');
        expect(after.status).toBe('已完成');
    });

    it('商品支付把收款商户写进商品', async () => {
        const list = await call<{ list: { id: number; status: string; payChannel?: string }[] }>(
            'goods/list?page=1&pageSize=500',
        );
        const onSale = list.list.find((g) => g.status === '已上架');
        expect(onSale).toBeDefined();

        await call(`goods/pay/${onSale?.id}`, 'PUT', { buyerUid: '100234', payChannel: 'MC002' });

        const after = await call<{ list: { id: number; payChannel?: string; status: string }[] }>(
            'goods/list?page=1&pageSize=500',
        );
        const row = after.list.find((g) => g.id === onSale?.id);
        expect(row?.status).toBe('已售出');
        expect(row?.payChannel).toBe('MC002');
    });
});
