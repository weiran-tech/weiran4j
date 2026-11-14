import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withApiSession, allowWrites } from './session.mjs';
import { recoverResources } from './resources.mjs';
import { readJson, inside, resolveExecution } from '../../framework/core.mjs';

try {
    allowWrites();
    const values = {};
    for (let index = 2; index < process.argv.length; index += 2) {
        const flag = process.argv[index], value = process.argv[index + 1];
        if (!['--env', '--run-id', '--api-base-url', '--web-base-url'].includes(flag) || !value || values[flag]) throw new Error();
        values[flag] = value;
    }
    const environment = values['--env'] ?? 'local', runId = values['--run-id'];
    if (!/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(environment) || !/^[a-f0-9]{24}$/.test(runId ?? '')) throw new Error();
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const profile = readJson(inside(root, `envs/${environment}.json`));
    const { environment: addresses } = resolveExecution({ params: [] }, profile,
        { ...(values['--api-base-url'] ? { 'api-base-url': values['--api-base-url'] } : {}),
            ...(values['--web-base-url'] ? { 'web-base-url': values['--web-base-url'] } : {}) });
    const result = await withApiSession({ root, environment, addresses, writes: true, borrowRole: false },
        (api) => recoverResources(api, runId));
    process.stdout.write(JSON.stringify({ runId, ...result }) + '\n');
} catch {
    process.stderr.write('API 资源恢复未完成：检查显式写入开关、参数、专用账号及私有清单；材料保持原样。\n');
    process.exitCode = 1;
}
