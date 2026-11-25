/** 同一源码构建当前版本的独立产物；根站保留为版本目录入口。 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import catalog from '../prototype/releases.json' with { type: 'json' };
import { versionBase } from '../prototype/routes.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', '.prototype-data/current-version', '--emptyOutDir'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, VITE_PROTOTYPE_VERSION: catalog.current, VITE_PROTOTYPE_ARCHIVE_ID: '', VITE_PROTOTYPE_KIND: 'working', VITE_PROTOTYPE_BASE: versionBase(catalog.current), VITE_PROTOTYPE_FINGERPRINT: '' },
});
