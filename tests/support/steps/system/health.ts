import type { APIRequestContext } from '@playwright/test';

/** Liveness only: this endpoint does not prove database readiness. */
export async function readHealth(backend: APIRequestContext) {
    const response = await backend.get('/api-backend/n/health');
    const body = await response.json();
    return { httpStatus: response.status(), code: body.code, health: body.data?.status };
}
