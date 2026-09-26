export const config = {
    /** 接口前缀；开发环境走 vite 代理，留空即可 */
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
    appTitle: import.meta.env.VITE_APP_TITLE || 'Weiran Admin',
};

/** 登录后的默认落地页（种子菜单 id=1） */
export const HOME_PATH = '/dashboard';
