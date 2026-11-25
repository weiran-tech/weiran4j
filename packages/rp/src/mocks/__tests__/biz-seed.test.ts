import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, MOCK_STORAGE_KEY, MOCK_SCHEMA_VERSION } from '../transport';
import { signIn } from '@/test/session';
import type { BizOrderView, BizPayRuleView, BizPendWdView, BizTradeRuleView } from '@/types/biz';
import { feeOf, netOf, platFeeOf, payGroupOf, poolOfWay } from '@/biz/biz-dict';

vi.unmock('@/mocks/transport');

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await mockFetch(`/api-backend/biz/${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = (await response.json()) as { code: number; message: string; data: T };
    expect(result.code, result.message).toBe(0);
    return result.data;
}

beforeEach(() => {
    localStorage.clear();
    signIn();
});

describe('商户后台示例：业务表读写', () => {
    it('业务表都能整表读取，且不是空表', async () => {
        const tables = [
            ['bizOrder', 21],
            ['bizPayment', 21],
            ['bizRefund', 7],
            ['bizWithdrawal', 10],
            ['bizPendWd', 6],
            ['bizAccount', 11],
            ['bizPayoutAccount', 5],
            ['bizEntity', 3],
            ['bizChannel', 8],
            ['bizExportJob', 4],
        ] as const;
        for (const [table, count] of tables) {
            const rows = await call<unknown[]>(`${table}/listAll`);
            expect(rows, table).toHaveLength(count);
        }
    });

    it('交易规则是单行配置：交易手续费 10%，包赔费默认 10% / 最低 10 / 最高 1000', async () => {
        const rule = await call<BizTradeRuleView>('bizTradeRule/get/1');
        expect(rule.trade.feePct).toBe(10);
        // 包赔费向买家收：小额单按 ¥10 兜底，大额单封在 ¥1,000
        expect(rule.guar).toEqual({ feePct: 10, feeMin: 10, feeMax: 1000 });
        // 算法与页面共用 feeOf：先按费率算，再夹下限、再夹上限
        expect(feeOf(60, rule.guar)).toBe(10);
        expect(feeOf(2000, rule.guar)).toBe(200);
        expect(feeOf(12800, rule.guar)).toBe(1000);
    });

    it('提现规则是单行配置：返利金冻结 30 分钟，两种到账方式都开着', async () => {
        const rule = await call<BizPayRuleView>('bizPayRule/get/1');
        expect(rule.general.freezeMin).toBe(30);
        expect(rule.ali.on && rule.bank.on).toBe(true);
        // 交易手续费已经拆走，这一份配置里不该再有 trade
        expect('trade' in rule).toBe(false);
    });

    it('样例金额自洽：订单 2680 的手续费 268、应提货款 2412，与提现单对得上', async () => {
        expect(platFeeOf(2680, 10)).toBe(268);
        expect(netOf(2680, 10)).toBe(2412);
        const rows = await call<BizOrderView[]>('bizOrder/listAll');
        const order = rows.find((o) => o.code === 'OD261103001');
        expect(order?.amt).toBe(2680);
        const wds = await call<{ code: string; orderCode: string; amt: number; commission: number }[]>('bizWithdrawal/listAll');
        const wd = wds.find((w) => w.orderCode === 'OD261103001');
        expect(wd).toMatchObject({ amt: 2412, commission: 268 });
    });

    it('更新订单的打款登记后写回本地存储', async () => {
        const rows = await call<BizOrderView[]>('bizOrder/listAll');
        const target = rows.find((o) => o.code === 'OD261103006')!;
        expect(target.offlinePay?.state).toBe('todo');
        await call(`bizOrder/update/${target.id}`, 'PUT', {
            offlinePay: { state: 'done', at: '2026-11-10 12:00', no: 'CMB202611101200001', by: '测试', proof: 'p.jpg' },
        });
        const after = await call<BizOrderView[]>('bizOrder/listAll');
        expect(after.find((o) => o.code === 'OD261103006')?.offlinePay?.state).toBe('done');
        expect(localStorage.getItem(MOCK_STORAGE_KEY)).toContain('CMB202611101200001');
    });

    it('合并提现单审核通过后进入冻结，并追加一条处理记录', async () => {
        const rows = await call<BizPendWdView[]>('bizPendWd/listAll');
        const target = rows.find((w) => w.code === 'PW261110001')!;
        expect(target.state).toBe('review');
        await call(`bizPendWd/update/${target.id}`, 'PUT', {
            state: 'frozen',
            frozenAt: '2026-11-10 12:00',
            freezeFrom: '2026-11-10 12:00',
            logs: [...target.logs, { at: '2026-11-10 12:00', who: '测试', act: '审核通过', note: '冻结 30 分钟' }],
        });
        const after = await call<BizPendWdView[]>('bizPendWd/listAll');
        const updated = after.find((w) => w.code === 'PW261110001')!;
        expect(updated.state).toBe('frozen');
        expect(updated.logs.at(-1)?.act).toBe('审核通过');
    });

    it('新增导出任务记入导出管理，删除后不再出现', async () => {
        const created = await call<{ id: number }>('bizExportJob/create', 'POST', {
            code: 'EXP-TEST-001',
            kind: 'orders',
            menu: '订单管理',
            filter: '渠道单',
            rows: 3,
            state: 'done',
            progress: 100,
            at: '2026-11-10 12:00',
            doneAt: '2026-11-10 12:01',
            file: '订单管理_test.xlsx',
            size: '0.1 MB',
            expireAt: '2026-11-17',
            downloads: 0,
            by: '测试',
            err: '',
        });
        expect((await call<unknown[]>('bizExportJob/listAll')).length).toBe(5);
        await call(`bizExportJob/delete/${created.id}`, 'DELETE');
        expect((await call<unknown[]>('bizExportJob/listAll')).length).toBe(4);
    });

    it('新增渠道与主体保存成功（新建渠道默认未开启）', async () => {
        const created = await call<{ id: number }>('bizChannel/create', 'POST', {
            code: 'MC-TEST',
            alias: '测试渠道',
            entity: 'LE001',
            dock: 'third',
            third: '汇付天下',
            ways: ['wx_jsapi'],
            rate: 6,
            cycle: 'T1',
            singleLimit: 10000,
            dayLimit: 100000,
            weight: 100,
            openFrom: '00:00:00',
            openTo: '23:59:59',
            on: false,
            at: '2026-11-10',
            note: '测试',
        });
        const rows = await call<{ code: string; on: boolean }[]>('bizChannel/listAll');
        expect(rows.find((c) => c.code === 'MC-TEST')).toMatchObject({ on: false });
        await call(`bizChannel/delete/${created.id}`, 'DELETE');
    });

    it('种子版本不符时回到初始数据（旧缓存不会让新表全空）', async () => {
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ version: MOCK_SCHEMA_VERSION - 1, tables: { user: [], menu: [] } }));
        expect((await call<unknown[]>('bizOrder/listAll')).length).toBe(21);
    });

    it('版本号相同但缺新字段时也回到种子（版本号防不住「给老表加字段」）', async () => {
        // 复现线上那种情况：给 opsUser 补了 settlement 却没升 MOCK_SCHEMA_VERSION，
        // 浏览器里的旧行会被原样沿用，于是「结算信息」按钮静默消失。
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({
            version: MOCK_SCHEMA_VERSION,
            tables: { user: [{ id: 1 }], menu: [{ id: 1 }], opsUser: [{ id: 1, uid: '100238', real: '已实名', nickname: '旧缓存用户' }] },
        }));
        const response = await mockFetch('/api-backend/ops/user/list?page=1&pageSize=500');
        const result = (await response.json()) as { code: number; data: { list: { nickname: string; settlement?: unknown }[] } };
        expect(result.code).toBe(0);
        expect(result.data.list[0]?.nickname).toBe('星辰游戏工作室');
        expect(result.data.list[0]?.settlement).toBeDefined();
    });
});

describe('业务字典与派生规则', () => {
    it('支付分组：成功含 paid/done，已关闭不算失败', () => {
        expect(payGroupOf('done')).toBe('ok');
        expect(payGroupOf('pending')).toBe('wait');
        expect(payGroupOf('failed')).toBe('fail');
        expect(payGroupOf('closed')).toBe('closed');
        expect(payGroupOf('unknown')).toBe('unknown');
    });

    it('收款方式归池：微信 / 支付宝两个大池，专有渠道各自成池', () => {
        expect(poolOfWay('wx_jsapi')).toBe('wx');
        expect(poolOfWay('ali_face')).toBe('ali');
        expect(poolOfWay('bank')).toBe('bank');
    });
});
