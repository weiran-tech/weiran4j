import { defaultPreferences, normalizePreferences, type UserPreferences } from '@/hooks/usePreferences';
import { applyTheme, isThemeMode, systemPrefersDark } from './theme';
import { DEFAULT_PRIMARY, DEFAULT_THEME_COLOR, isValidThemeColor } from './theme-color';

/** 偏好的本地缓存键（登录前 / 服务端不可用时的来源，也是首屏防闪白的依据） */
export const PREFERENCES_STORAGE_KEY = 'weiran_preferences';
/**
 * 本地偏好缓存属于哪个用户（用户 id 字符串）。登录后服务端没有偏好时，只有归属与当前用户一致才把本地缓存迁上去；
 * 没有这个键（旧版缓存、登录页上改的）视为「归属未知」，不迁给任何账号。
 */
export const PREFERENCES_OWNER_KEY = 'weiran_preferences_owner';
/** 旧版主题存储（`{mode, color}`）；首次加载时迁入偏好后删除 */
export const LEGACY_THEME_STORAGE_KEY = 'weiran_theme';

/** 旧版主题色 `default` 即 #0064FA；偏好里一律存 hex */
export function canonicalThemeColor(color: string): string {
    return color === DEFAULT_THEME_COLOR ? DEFAULT_PRIMARY : color;
}

function readLegacyTheme(): Partial<UserPreferences> | null {
    const raw = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (raw === null) return null;
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        const { mode, color } = parsed as Record<string, unknown>;
        return {
            ...(isThemeMode(mode) ? { colorMode: mode } : {}),
            ...(isValidThemeColor(color) ? { themeColor: canonicalThemeColor(color) } : {}),
        };
    } catch {
        return null;
    }
}

/**
 * 读本地偏好；存储不可用或 JSON 损坏时回落默认值，非法字段逐项回落。
 * 只有旧版 `weiran_theme` 时把它迁进偏好（写回新键、删旧键），之后只认偏好。
 */
export function loadPreferences(): UserPreferences {
    try {
        const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        const legacy = readLegacyTheme();
        if (raw !== null) {
            const parsed: unknown = JSON.parse(raw);
            const prefs = normalizePreferences(parsed);
            return { ...prefs, themeColor: canonicalThemeColor(prefs.themeColor) };
        }
        if (legacy) {
            const migrated = normalizePreferences({ ...defaultPreferences, ...legacy });
            savePreferences(migrated);
            return migrated;
        }
    } catch {
        // 忽略：回落默认值
    }
    return { ...defaultPreferences };
}

/** 写本地偏好并记下归属（`ownerId` 为 null 即归属未知）；隐私模式 / 配额满时静默失败，不影响当次会话 */
export function savePreferences(prefs: UserPreferences, ownerId: number | null = null): void {
    try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
        if (ownerId === null) localStorage.removeItem(PREFERENCES_OWNER_KEY);
        else localStorage.setItem(PREFERENCES_OWNER_KEY, String(ownerId));
    } catch {
        // 忽略
    }
}

/** 本地缓存的归属用户 id；没有或不合法（旧版缓存）返回 null */
export function loadPreferencesOwner(): number | null {
    try {
        const id = Number(localStorage.getItem(PREFERENCES_OWNER_KEY));
        return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

/** 清本地偏好与归属（恢复默认、退出登录时） */
export function clearPreferences(): void {
    try {
        localStorage.removeItem(PREFERENCES_STORAGE_KEY);
        localStorage.removeItem(PREFERENCES_OWNER_KEY);
    } catch {
        // 忽略
    }
}

/** 在 React 挂载前同步应用已存主题（明暗 + 主色），避免深色用户首屏先闪一下白底 */
export function bootstrapTheme(): void {
    const { colorMode, themeColor } = loadPreferences();
    applyTheme(colorMode, themeColor, systemPrefersDark());
}
