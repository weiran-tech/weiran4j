import { useSyncExternalStore } from 'react';

/**
 * 锁屏状态（偏好 enableLockScreen）。
 *
 * 存 sessionStorage：刷新后仍保持锁定，关掉浏览器标签页即失效（会话在 Cookie 里，锁屏不是登录态的一部分）。
 * 做成可订阅的外部 store，顶栏按钮、快捷键与锁屏遮罩共用一份状态。
 * 与 mono4ts 的差异：mono4ts 要求先设一个本地锁屏密码（base64 存 localStorage）；
 * 这里直接用登录密码，经 `POST /api/auth/verify-password` 校验，不在浏览器里保存任何口令。
 */
export const LOCK_STORAGE_KEY = 'weiran_locked';

const listeners = new Set<() => void>();
/** sessionStorage 不可用（隐私模式）时的兜底 */
let memoryLocked = false;

function isLocked(): boolean {
    try {
        return sessionStorage.getItem(LOCK_STORAGE_KEY) === '1';
    } catch {
        return memoryLocked;
    }
}

function setLocked(locked: boolean) {
    memoryLocked = locked;
    try {
        if (locked) sessionStorage.setItem(LOCK_STORAGE_KEY, '1');
        else sessionStorage.removeItem(LOCK_STORAGE_KEY);
    } catch {
        // 写入失败时本次会话按内存状态
    }
    listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

export const lockScreen = () => setLocked(true);
/** 解锁；也用于退出登录时清掉，避免下一个账号一登录就是锁屏 */
export const unlockScreen = () => setLocked(false);

export function useIsLocked(): boolean {
    return useSyncExternalStore(subscribe, isLocked, () => false);
}
