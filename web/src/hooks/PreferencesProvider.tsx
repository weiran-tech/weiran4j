import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearPreferences, loadPreferences, loadPreferencesOwner, savePreferences } from '@/lib/preferences-storage';
import { http } from '@/utils/request';
import { sessionUserId, useSession } from '@/utils/session';
import { defaultPreferences, normalizePreferences, PreferencesContext, type UserPreferences } from './usePreferences';

const PREFERENCES_API = '/api/auth/preferences';
/** 连续修改（拖滑块、连点开关）合并成一次写入 */
export const PREFERENCES_SYNC_DELAY = 500;

/**
 * 偏好状态源（移植自 mono4ts `PreferencesProvider`）：
 * - 本地缓存 `localStorage.weiran_preferences` 是首屏与未登录时的来源，`weiran_preferences_owner` 记它属于哪个用户（会话 Cookie `weiran_csrf` 的 userId 前缀）；
 * - 登录后 GET 服务端偏好合并覆盖本地；服务端从未保存过（null）时，**只有本地缓存属于当前用户**才迁上去，
 *   否则（别的账号留下的、旧版无归属的、登录页上改的）当前用户从默认值开始，不 PUT——不把别人的偏好写进他的账号；
 * - 退出登录（主动退出、clearSession、401 清会话、其它标签页退出）即会话从有到无时，清本地缓存并回到默认值
 *   （登录页因此回到默认浅色主题，这是有意的取舍）；
 * - 修改 500ms 防抖 PUT；恢复默认立即 PUT；未登录（登录页）只写本地、不发请求。
 */
export function PreferencesProvider({ children }: Readonly<{ children: ReactNode }>) {
    const session = useSession();
    const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);
    const prefsRef = useRef(prefs);
    const sessionRef = useRef(session);
    /** 当前登录用户 id（来自会话），本地缓存按它记归属；未登录为 null */
    const userIdRef = useRef(sessionUserId(session));
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelSync = useCallback(() => {
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
            syncTimerRef.current = null;
        }
    }, []);

    const applyLocal = useCallback((next: UserPreferences, persist = true) => {
        prefsRef.current = next;
        setPrefs(next);
        if (persist) savePreferences(next, userIdRef.current);
    }, []);

    const putPreferences = useCallback((next: UserPreferences) => {
        if (!sessionRef.current) return;
        http.put<null>(PREFERENCES_API, next, { silent: true }).catch(() => {
            // 同步失败不打扰用户：本地已生效，下次修改会再全量覆盖
        });
    }, []);

    const scheduleSync = useCallback(
        (next: UserPreferences) => {
            if (!sessionRef.current) return;
            cancelSync();
            syncTimerRef.current = setTimeout(() => {
                syncTimerRef.current = null;
                putPreferences(next);
            }, PREFERENCES_SYNC_DELAY);
        },
        [cancelSync, putPreferences],
    );

    // 登录（或换账号）后从服务端拉取；登出时丢弃还没发出的写入并清掉本地缓存
    useEffect(() => {
        const hadSession = sessionRef.current !== null;
        sessionRef.current = session;
        userIdRef.current = sessionUserId(session);
        if (!session) {
            if (hadSession) {
                clearPreferences();
                applyLocal({ ...defaultPreferences }, false);
            }
            return undefined;
        }
        const userId = userIdRef.current;
        let cancelled = false;
        http.get<unknown>(PREFERENCES_API, { silent: true })
            .then((data) => {
                if (cancelled) return;
                if (data !== null && typeof data === 'object') {
                    applyLocal(normalizePreferences(data));
                    return;
                }
                // 服务端还没有偏好：本地缓存是这个用户自己的才迁上去；别人的 / 归属未知的不继承，从默认值开始
                if (userId !== null && loadPreferencesOwner() === userId) {
                    scheduleSync(prefsRef.current);
                } else {
                    applyLocal({ ...defaultPreferences });
                }
            })
            .catch(() => {
                // 拉取失败沿用本地缓存
            });
        return () => {
            cancelled = true;
            cancelSync();
        };
    }, [session, applyLocal, scheduleSync, cancelSync]);

    const setPreferences = useCallback(
        (partial: Partial<UserPreferences>) => {
            const next = normalizePreferences({ ...prefsRef.current, ...partial });
            applyLocal(next);
            scheduleSync(next);
        },
        [applyLocal, scheduleSync],
    );

    const resetPreferences = useCallback(() => {
        const next = { ...defaultPreferences };
        clearPreferences();
        applyLocal(next, false);
        cancelSync();
        putPreferences(next);
    }, [applyLocal, cancelSync, putPreferences]);

    const value = useMemo(() => ({ preferences: prefs, setPreferences, resetPreferences }), [prefs, setPreferences, resetPreferences]);

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
