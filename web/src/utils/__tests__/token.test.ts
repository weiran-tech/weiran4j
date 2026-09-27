import { describe, expect, it } from 'vitest';
import { fakeJwt } from '@/test/helpers';
import { tokenUserId } from '../token';

describe('tokenUserId', () => {
    it('从 JWT 载荷的 sub 读用户 id', () => {
        expect(tokenUserId(fakeJwt(42))).toBe(42);
    });

    it('不是 JWT、载荷损坏、sub 不是正整数时返回 null', () => {
        expect(tokenUserId(null)).toBeNull();
        expect(tokenUserId('t')).toBeNull();
        expect(tokenUserId('a.@@@.b')).toBeNull();
        expect(tokenUserId(`x.${btoa(JSON.stringify({ sub: 'abc' }))}.y`)).toBeNull();
        expect(tokenUserId(`x.${btoa(JSON.stringify({ sub: 0 }))}.y`)).toBeNull();
    });
});
