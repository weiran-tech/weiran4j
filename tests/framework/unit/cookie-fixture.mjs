/** Synthetic secrets only; logout deliberately does NOT revoke an issued token. */
export const TOKEN_VALUE = 'synthetic-cookie-secret';
export function cookieHeaders(clear = false) {
    const headers = new Headers();
    headers.append('set-cookie', `weiran_token=${clear ? '' : TOKEN_VALUE}; Path=/api-backend; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 3600}`);
    headers.append('set-cookie', `weiran_csrf=${clear ? '' : '1.synthetic-csrf'}; Path=/; SameSite=Strict; Max-Age=${clear ? 0 : 3600}`);
    return headers;
}
export function storageState(hostname = 'localhost') {
    return { cookies: [
        { name: 'weiran_token', value: TOKEN_VALUE, domain: hostname, path: '/api-backend', expires: Date.now() / 1000 + 3600, httpOnly: true, secure: false, sameSite: 'Strict' },
        { name: 'weiran_csrf', value: '1.synthetic-csrf', domain: hostname, path: '/', expires: Date.now() / 1000 + 3600, httpOnly: false, secure: false, sameSite: 'Strict' },
    ], origins: [] };
}
export function mockCookieFetch() {
    const state = { calls: [], failIdentity: false, failCleanup: false, failSnapshot: false, wrongIdentity: false, expired: false, clearCookies: true };
    const fetcher = async (url, options = {}) => {
        const route = new URL(url).pathname, headers = new Headers(options.headers);
        state.calls.push({ route, method: options.method, cookie: headers.get('cookie'), csrf: headers.get('x-csrf-token') });
        if (route.endsWith('/login')) return Response.json({ code: 0, data: { userId: 1, mfaRequired: false } }, { headers: cookieHeaders() });
        const authenticated = !state.expired && headers.get('cookie')?.includes(`weiran_token=${TOKEN_VALUE}`);
        if (!authenticated) return Response.json({ code: 100101, data: null }, { status: 401 });
        if (route.endsWith('/logout')) {
            if (headers.get('x-csrf-token') !== '1.synthetic-csrf') return Response.json({ code: 100103, data: null }, { status: 403 });
            if (state.failCleanup) throw new Error(TOKEN_VALUE);
            return Response.json({ code: 0, data: null }, { headers: state.clearCookies ? cookieHeaders(true) : new Headers() });
        }
        if (state.failIdentity && route.endsWith('/getCurrentUser')) return Response.json({ code: 100005, data: null }, { status: 500 });
        const user = { id: state.wrongIdentity ? 2 : 1, username: 'admin', roles: ['super_admin'], permissions: ['*'] };
        if (route.endsWith('/getAuthorizationSnapshot')) return state.failSnapshot ? Response.json({ code: 100005 }, { status: 500 })
            : Response.json({ code: 0, data: { user, menus: [], revision: '1' } });
        return Response.json({ code: 0, data: user });
    };
    return { state, fetcher };
}
