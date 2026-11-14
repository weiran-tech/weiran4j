import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { TestInfo } from '@playwright/test';

// 调用方只传已挑选的观察字段，不把令牌、凭证或完整业务响应作为状态证据。
export async function attachState(testInfo: TestInfo, name: string, state: unknown) {
    const path = testInfo.outputPath(`${name}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
    await testInfo.attach(name, { path, contentType: 'application/json' });
}
