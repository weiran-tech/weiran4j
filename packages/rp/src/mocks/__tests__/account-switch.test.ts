import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../transport';
import { signIn } from '@/test/session';

vi.unmock('@/mocks/transport');

/**
 * 主体状态 → 出款 / 收款开关（2026-11-16 业务口径）
 *
 * 1. 主体异常或冻结时，**线上**的出款账户与收款渠道不能开启；已经开着的自动关闭。
 * 2. 线下不受影响：人工转账 / 平台店铺走款不看渠道健康度。
 *
 * 这两条是数据层的规则，不是界面上的提示 —— 界面能绕过去，接口不该能绕过。
 */
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await mockFetch(`/api-backend/biz/${path}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return (await response.json()) as T;
}
async function ok<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const result = await call<{ code: number; message: string; data: T }>(path, method, body);
    expect(result.code, result.message).toBe(0);
    return result.data;
}

beforeEach(() => {
    localStorage.clear();
    signIn();
});

describe('主体异常 / 冻结 → 线上开关', () => {
    it('冻结的主体：线上出款账户不能开启', async () => {
        // AC005 是冻结的支付宝主体；先把它挂到一条线上出款账户上
        const payouts = await ok<{ id: number; wd: boolean; online: boolean; acct: string }[]>('bizPayoutAccount/listAll');
        const ali = payouts.find((p) => p.acct === 'AC002');
        expect(ali?.online).toBe(true);

        // 把 AC002 改成冻结，再试着开启引用它的出款账户
        await ok('bizAccount/update/2', 'PUT', { frozen: true });
        const result = await call<{ code: number; message: string }>(`bizPayoutAccount/update/${ali?.id}`, 'PUT', { wd: true });
        expect(result.code).not.toBe(0);
        expect(result.message).toContain('不能开启');
    });

    it('异常的主体：线上收款渠道不能开启', async () => {
        const channels = await ok<{ id: number; alias: string; online: boolean; acct: string; on: boolean }[]>(
            'bizChannel/listAll',
        );
        // MC002 走 AC002（支付宝主体），线上
        const ch = channels.find((c) => c.alias === '汇付支付宝01');
        expect(ch?.online).toBe(true);
        expect(ch?.on).toBe(true);

        await ok('bizAccount/update/2', 'PUT', { normal: false });
        // 先关掉，再试着重新开 —— 应当被拦
        await ok(`bizChannel/update/${ch?.id}`, 'PUT', { on: false });
        const result = await call<{ code: number; message: string }>(`bizChannel/update/${ch?.id}`, 'PUT', { on: true });
        expect(result.code).not.toBe(0);
        expect(result.message).toContain('不能开启');
    });

    it('主体被置为异常时，引用它的线上开关自动关闭', async () => {
        const before = await ok<{ alias: string; on: boolean }[]>('bizChannel/listAll');
        expect(before.find((c) => c.alias === '汇付支付宝01')?.on).toBe(true);

        // AC002 被置为异常 —— 引用它的线上渠道应自动关掉
        await ok('bizAccount/update/2', 'PUT', { normal: false });

        const after = await ok<{ alias: string; on: boolean }[]>('bizChannel/listAll');
        expect(after.find((c) => c.alias === '汇付支付宝01')?.on).toBe(false);
        // 线下渠道不受影响：MC008 走 AC008（异常），但它是线下，开关应保持原样
        expect(after.find((c) => c.alias === '抖音收银台01')?.on).toBe(true);
    });

    it('线下渠道不受主体状态影响：账户异常也能开关', async () => {
        // 抖音收银台01 是线下渠道，引用 AC008（主体异常）
        const channels = await ok<{ id: number; alias: string; online: boolean; acct: string; on: boolean }[]>(
            'bizChannel/listAll',
        );
        const ch = channels.find((c) => c.alias === '抖音收银台01');
        expect(ch?.online).toBe(false);
        expect(ch?.acct).toBe('AC008');

        // 先关再开：线下不看渠道健康度，两步都应成功
        expect((await call<{ code: number }>(`bizChannel/update/${ch?.id}`, 'PUT', { on: false })).code).toBe(0);
        expect((await call<{ code: number }>(`bizChannel/update/${ch?.id}`, 'PUT', { on: true })).code).toBe(0);

        const after = await ok<{ alias: string; on: boolean }[]>('bizChannel/listAll');
        expect(after.find((c) => c.alias === '抖音收银台01')?.on).toBe(true);
    });
});
