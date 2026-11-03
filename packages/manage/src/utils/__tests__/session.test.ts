import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { signIn } from '@/test/session';
import { clearSession, getSession, refreshSession, sessionUserId, useSession } from '../session';

describe('getSession', () => {
    it('没有 Cookie 时返回 null', () => {
        expect(getSession()).toBeNull();
    });

    it('多个 Cookie 中只取 weiran_csrf', () => {
        document.cookie = 'other=1; path=/';
        document.cookie = 'weiran_csrf_x=9.nope; path=/';
        document.cookie = 'weiran_csrf=5.abc-_; path=/';
        document.cookie = 'last=z; path=/';
        expect(getSession()).toBe('5.abc-_');
        document.cookie = 'other=; Max-Age=0; path=/';
        document.cookie = 'weiran_csrf_x=; Max-Age=0; path=/';
        document.cookie = 'last=; Max-Age=0; path=/';
    });

    it('URL 编码的值会被解码', () => {
        document.cookie = 'weiran_csrf=3.a%2Bb%3D; path=/';
        expect(getSession()).toBe('3.a+b=');
    });

    it('值不是合法的 URI 编码时按未登录处理', () => {
        document.cookie = 'weiran_csrf=1.%E0%A4%A; path=/';
        expect(getSession()).toBeNull();
    });
});

describe('sessionUserId', () => {
    it('取点前的正整数', () => {
        expect(sessionUserId('42.abc')).toBe(42);
    });

    it('空、无点、非数字、0、负数时返回 null', () => {
        expect(sessionUserId(null)).toBeNull();
        expect(sessionUserId('')).toBeNull();
        expect(sessionUserId('42')).toBeNull();
        expect(sessionUserId('.abc')).toBeNull();
        expect(sessionUserId('abc.def')).toBeNull();
        expect(sessionUserId('1e3.x')).toBeNull();
        expect(sessionUserId('0.abc')).toBeNull();
        expect(sessionUserId('-1.abc')).toBeNull();
    });
});

describe('clearSession / refreshSession / useSession', () => {
    it('clearSession 后 getSession 为 null，订阅者收到通知', () => {
        const session = signIn(2);
        const { result } = renderHook(() => useSession());
        expect(result.current).toBe(session);
        act(() => clearSession());
        expect(getSession()).toBeNull();
        expect(result.current).toBeNull();
    });

    it('refreshSession 让订阅者读到浏览器新写入的 Cookie', () => {
        const { result } = renderHook(() => useSession());
        expect(result.current).toBeNull();
        document.cookie = 'weiran_csrf=1.x; path=/';
        expect(result.current).toBeNull();
        act(() => refreshSession());
        expect(result.current).toBe('1.x');
    });

    it('窗口重新获得焦点时重新读取（跨标签页同步）', () => {
        signIn(1);
        const { result } = renderHook(() => useSession());
        document.cookie = 'weiran_csrf=; Max-Age=0; path=/';
        act(() => {
            window.dispatchEvent(new Event('focus'));
        });
        expect(result.current).toBeNull();
    });

    it('页面变为可见时重新读取', () => {
        const { result } = renderHook(() => useSession());
        document.cookie = 'weiran_csrf=8.y; path=/';
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(result.current).toBe('8.y');
        vi.restoreAllMocks();
    });
});
