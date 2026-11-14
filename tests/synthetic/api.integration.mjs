import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createApiModel } from './model.mjs';

// This is a synthetic HTTP service with real CLI/Playwright processes, never a real business pass.
test('API 合成装配：8条新流程、匿名矩阵、写前提、失败恢复及敏感产物扫描', { timeout: 180000 }, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran-api-integration-'));
    const root = path.join(directory, 'tests'), source = path.resolve(import.meta.dirname, '..');
    const model = createApiModel(), secrets = ['synthetic-admin-password'];
    const server = createServer(async (request, response) => {
        let body = '';
        for await (const chunk of request) body += chunk;
        try {
            if (body) { const parsed = JSON.parse(body); if (parsed.password) secrets.push(parsed.password); }
            const value = await model.dispatch(`http://127.0.0.1${request.url}`, { method: request.method, headers: request.headers, ...(body ? { body } : {}) });
            response.statusCode = value.status; response.setHeader('Content-Type', 'application/json');
            const cookies = value.headers.getSetCookie();
            if (cookies.length) {
                response.setHeader('Set-Cookie', cookies);
                for (const cookie of cookies) { const secret = cookie.split(';')[0].split('=')[1]; if (secret) secrets.push(secret); }
            }
            response.end(JSON.stringify(value.payload));
        } catch { response.destroy(); }
    });
    const execute = async (script, args, extra = {}) => {
        const child = spawn(process.execPath, [script, ...args], { cwd: directory, env: { ...process.env,
            FLOW_ADMIN_USERNAME: 'api_admin', FLOW_ADMIN_PASSWORD: 'synthetic-admin-password', FLOW_ADMIN_PASSWORD_FILE: path.join(root, '.local/synthetic-only.json'), FLOW_ALLOW_WRITE: 'true', ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = ''; child.stdout.on('data', (part) => output += part); child.stderr.on('data', (part) => output += part);
        const [code] = await once(child, 'close');
        for (const secret of secrets) assert.ok(!output.includes(secret), 'CLI output must not contain authentication material');
        return { code, output };
    };
    const cli = (...args) => execute('tests/framework/cli.mjs', args);
    try {
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = `http://127.0.0.1:${server.address().port}`;
        fs.mkdirSync(root, { recursive: true });
        for (const name of ['package.json', 'pnpm-lock.yaml']) fs.copyFileSync(path.join(source, '..', name), path.join(directory, name));
        fs.symlinkSync(path.resolve(source, '../node_modules'), path.join(directory, 'node_modules'), 'dir');
        for (const name of ['framework', 'support']) fs.cpSync(path.join(source, name), path.join(root, name), { recursive: true });
        for (const name of ['playwright.config.ts', 'tsconfig.json']) fs.copyFileSync(path.join(source, name), path.join(root, name));
        const registry = JSON.parse(fs.readFileSync(path.join(source, 'registry.json')));
        registry.flows.forEach((file) => {
            const meta = JSON.parse(fs.readFileSync(path.join(source, file)));
            fs.cpSync(path.join(source, path.dirname(file)), path.join(root, path.dirname(file)), { recursive: true });
        });
        fs.cpSync(path.join(source, 'bruno'), path.join(root, 'bruno'), { recursive: true });
        fs.writeFileSync(path.join(root, 'registry.json'), JSON.stringify(registry));
        fs.mkdirSync(path.join(root, 'envs')); fs.writeFileSync(path.join(root, 'envs/local.json'), JSON.stringify({ apiBaseURL: address, webBaseURL: address }));
        const run = await cli('run', '--tag', 'api-business', '--env', 'local');
        assert.equal(run.code, 0, run.output);
        assert.match(run.output, /"selected": 8/);
        const anonymous = await cli('run', 'system/access-boundary', '--env', 'local'); assert.equal(anonymous.code, 0, anonymous.output);
        assert.equal(model.db.user.length, 1); assert.equal(model.db.role.length, 0); assert.equal(model.db.menu.length, 1);
        assert.equal(model.db.dict.length, 0); assert.equal(model.db.dictItem.length, 0); assert.equal(model.db.config.length, 1); assert.equal(model.db.configGroup.length, 1);
        const before = model.calls.filter((call) => call.route.endsWith('/login')).length;
        const noWrites = await cli('run', 'system/user-lifecycle', '--env', 'local', '--param', 'ALLOW_WRITE=false');
        assert.equal(noWrites.code, 1); assert.equal(model.calls.filter((call) => call.route.endsWith('/login')).length, before);
        // Real worker fails to delete; recover through the actual recovery command with a new session.
        model.fault.failDelete = true;
        const failed = await cli('run', 'system/user-lifecycle', '--env', 'local'); assert.equal(failed.code, 1);
        const journalDirectory = path.join(root, '.local/api-resources/local');
        const journals = fs.readdirSync(journalDirectory); assert.equal(journals.length, 1); assert.equal(model.db.user.length, 2);
        const runId = journals[0].replace(/\.json$/, ''); model.fault.failDelete = false;
        let result = await execute('tests/support/api/cleanup.mjs', ['--env', 'local', '--run-id', runId]); assert.equal(result.code, 0, result.output);
        result = await execute('tests/support/api/cleanup.mjs', ['--env', 'local', '--run-id', runId]); assert.equal(result.code, 0, result.output);
        assert.equal(model.db.user.length, 1); assert.equal(fs.readdirSync(journalDirectory).length, 0);
        const scan = (folder) => {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                const file = path.join(folder, entry.name);
                if (entry.isDirectory()) scan(file);
                else { const value = fs.readFileSync(file); for (const secret of secrets) assert.ok(!value.includes(Buffer.from(secret)), 'ordinary artifact must not contain authentication material'); }
            }
        };
        scan(path.join(root, '.artifacts'));
        console.log('8 条新增 API 流程及扩充匿名矩阵在合成 HTTP 服务实际通过；不代表真实业务通过。');
    } finally {
        server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
