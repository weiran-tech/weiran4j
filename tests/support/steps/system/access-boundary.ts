import type { APIRequestContext } from '@playwright/test';

export async function readAccessBoundary(backend: APIRequestContext) {
    const observations = [];
    for (const [method, path] of [
        ['GET', '/api-backend/system/auth/getCurrentUser'],
        ['GET', '/api-backend/system/auth/getAuthorizationSnapshot'],
        ['POST', '/api-backend/system/auth/logout'],
    ] as const) {
        const response = await backend.fetch(path, { method });
        const body = await response.json();
        observations.push({ path, httpStatus: response.status(), code: body.code, data: body.data });
    }
    return observations;
}
