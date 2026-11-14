import local from '../../envs/local.json';

function address(value: string) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error('测试地址必须为不包含凭据、query 或 fragment 的 HTTP(S) URL');
    }
    return url.href.replace(/\/$/, '');
}
export const apiBaseURL = address(process.env.TEST_API_BASE_URL || local.apiBaseURL);
export const webBaseURL = address(process.env.TEST_WEB_BASE_URL || local.webBaseURL);
