import type { APIRequestContext } from '@playwright/test';

export async function readAccessBoundary(backend: APIRequestContext) {
    const observations = [];
    for (const [method, path] of [
        ['GET', '/api-backend/system/auth/getCurrentUser'],
        ['GET', '/api-backend/system/auth/getAuthorizationSnapshot'],
        ['POST', '/api-backend/system/auth/logout'],
        ['GET', '/api-backend/system/user/list'],
        ['GET', '/api-backend/system/role/list'],
        ['GET', '/api-backend/system/menu/list'],
        ['GET', '/api-backend/system/dict/list'],
        ['GET', '/api-backend/system/config/list'],
        ['GET', '/api-backend/system/loginLog/list'],
        ['GET', '/api-backend/system/operationLog/list'],
    ] as const) {
        const response = await backend.fetch(path, { method });
        const body = await response.json();
        observations.push({ path, httpStatus: response.status(), code: Number.isSafeInteger(body.code) ? body.code : null, dataIsNull: body.data === null });
    }
    return observations;
}
