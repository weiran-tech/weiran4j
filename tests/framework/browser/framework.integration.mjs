import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import { loginWindow } from '../browser.mjs';
import { checkSession, clearSession } from '../session.mjs';
import { runParallelPages } from '../../support/helpers/parallel-pages.ts';

// The synthetic server intentionally keeps the old token valid after logout.
// This verifies Cookie cleanup without inventing server-side JWT revocation.
test('Chromium：人工/API登录、CLI复用、Cookie/CSRF、系统流程与失败清理', { timeout: 180000 }, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-browser-framework-'));
    const root = path.join(directory, 'tests'), source = path.resolve(import.meta.dirname, '../..');
    const secret = 'synthetic-browser-cookie', password = 'synthetic-password';
    let browser, loginCount = 0, logoutCount = 0;
    const setCookies = (response, clear = false) => response.setHeader('Set-Cookie', [
        `weiran_token=${clear ? '' : secret}; Path=/api-backend; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 3600}`,
        `weiran_csrf=${clear ? '' : '1.synthetic-csrf'}; Path=/; SameSite=Strict; Max-Age=${clear ? 0 : 3600}`,
    ]);
    const server = createServer((request, response) => {
        const authenticated = request.headers.cookie?.includes(`weiran_token=${secret}`);
        if (request.url.startsWith('/api-backend/')) {
            response.setHeader('Content-Type', 'application/json');
            const send = (status, code, data = null) => { response.statusCode = status; response.end(JSON.stringify({ code, message: 'synthetic', data })); };
            if (request.url.endsWith('/health')) return send(200, 0, { status: 'UP' });
            if (request.url.endsWith('/listProviders')) return send(200, 0, { passwordLoginEnabled: true, providers: [] });
            if (request.url.endsWith('/login')) { loginCount++; setCookies(response); return send(200, 0, { userId: 1, mfaRequired: false }); }
            if (!authenticated) return send(401, 100101);
            if (request.url.endsWith('/logout')) {
                if (request.headers['x-csrf-token'] !== '1.synthetic-csrf') return send(403, 100103);
                logoutCount++; setCookies(response, true); return send(200, 0);
            }
            const user = { id: 1, username: 'admin', roles: ['super_admin'], permissions: ['*'] };
            if (request.url.endsWith('/getAuthorizationSnapshot')) return send(200, 0, { user, menus: [], revision: '1' });
            return send(200, 0, user);
        }
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        if (request.url.startsWith('/profile') && !request.headers.cookie?.includes('weiran_csrf=')) { response.statusCode = 302; response.setHeader('Location', '/login?redirect=%2Fprofile'); return response.end(); }
        if (request.url === '/login-auto') {
            setCookies(response); loginCount++;
            return response.end("<script>location='/profile'</script>");
        }
        if (request.url.startsWith('/login')) return response.end(`<input placeholder="请输入用户名"><input type="password" placeholder="请输入密码"><button>登录</button><script>document.querySelector('button').onclick=async()=>{await fetch('/api-backend/n/system/auth/login',{method:'POST'});location='/profile'}</script>`);
        response.end('<h1>Framework profile</h1><span class="admin-header__user">admin</span><p>登录时使用的账号名称</p>');
    });
    const write = (file, value) => { const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
    const json = (file, value) => write(file, JSON.stringify(value));
    const cli = async (...args) => {
        const child = spawn(process.execPath, ['tests/framework/cli.mjs', ...args], { cwd: directory, stdio: ['ignore','pipe','pipe'],
            env: { ...process.env, FLOW_ADMIN_PASSWORD: password, FLOW_ADMIN_PASSWORD_FILE: path.join(root, '.local/admin.json') } });
        let logs = ''; child.stdout.on('data', (data) => { logs += data; }); child.stderr.on('data', (data) => { logs += data; });
        const [code] = await once(child, 'close');
        assert.ok(!logs.includes(secret) && !logs.includes(password), 'ordinary logs must not contain authentication material');
        return { code, logs };
    };
    try {
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const baseURL = `http://127.0.0.1:${server.address().port}`, addresses = { apiBaseURL: baseURL, webBaseURL: baseURL };
        for (const name of ['framework','support']) fs.cpSync(path.join(source, name), path.join(root, name), { recursive: true });
        for (const name of ['tsconfig.json','playwright.config.ts']) write(`tests/${name}`, fs.readFileSync(path.join(source, name)));
        for (const name of ['package.json','pnpm-lock.yaml']) write(name, fs.readFileSync(path.join(source, '..', name)));
        fs.symlinkSync(path.join(source, '../node_modules'), path.join(directory, 'node_modules'));
        json('tests/envs/local.json', { ...addresses, portals: {
            admin: { loginPath: '/login-auto', homePath: '/profile', loginMode: 'manual' },
            password: { loginPath: '/login', homePath: '/profile', loginMode: 'password' },
        } });
        write('tests/support/steps/INDEX.md', '# Steps');
        // The custom probe does not depend on source system steps.
        fs.rmSync(path.join(root, 'support/steps'), { recursive: true }); fs.mkdirSync(path.join(root, 'support/steps'), { recursive: true });
        write('tests/support/steps/INDEX.md', '# Steps');
        const flow = { version: 1, businessProject: 'weiran4j', id: 'weiran4j/reuse', title: '合成 Cookie 复用', runner: 'playwright', project: 'e2e',
            entry: 'e2e/reuse/reuse.spec.ts', kind: 'read-only', expectedCases: 1, envs: ['local'], tags: ['framework'], params: [],
            preconditions: ['仅合成服务'], verification: ['复用绑定 Cookie'], limitations: ['不代表真实业务覆盖'], cleanup: '清 Cookie 和缓存',
            steps: [], inputs: [], evidence: { requiredAttachments: ['state'] } };
        json('tests/e2e/reuse/flow.json', flow); write('tests/e2e/reuse/plan.md', '# Synthetic reuse');
        write('tests/e2e/reuse/reuse.spec.ts', `import{test,expect}from'../../support/fixtures/test';test('reuse',async({page},info)=>{await page.goto('/profile');await expect(page.getByRole('heading')).toHaveText('Framework profile');expect(await page.evaluate(()=>document.cookie.includes('weiran_token'))).toBe(false);expect(await page.evaluate(()=>localStorage.length)).toBe(0);await info.attach('state',{body:'{"httpOnlyProtected":true}',contentType:'application/json'});});`);
        json('tests/registry.json', { version: 1, flows: ['e2e/reuse/flow.json'] });
        const saved = await loginWindow(root, 'local', 'admin', { 'timeout-ms': '10000' }, { launch: (options) => chromium.launch({ ...options, headless: true }) });
        assert.equal(saved.saved, true);
        const checked = await checkSession(root, 'local', 'admin', addresses);
        const reused = await cli('run', flow.id, '--env','local','--headless','--role','admin'); assert.equal(reused.code, 0, reused.logs);
        const runDirectory = path.join(root, '.artifacts/runs');
        assert.equal(JSON.parse(fs.readFileSync(path.join(runDirectory, fs.readdirSync(runDirectory)[0], 'verification.json'))).complete, true);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ baseURL, storageState: checked.session.storageState });
        const attachments = [];
        await runParallelPages(context, [1,2,3].map((n) => ({ name: `native-${n}`, run: async (page, attach) => {
            await page.goto('/profile'); assert.equal(await page.locator('h1').innerText(), 'Framework profile'); await attach('state', { body:'{}', contentType:'application/json' });
        } })), { attach: async (name) => attachments.push(name) }, { maxConcurrency: 2 });
        assert.equal(attachments.length, 3); assert.equal(context.pages().length, 0); await context.close();
        await clearSession(root, 'local', 'admin', addresses);
        assert.equal(fs.existsSync(checked.file), false);
        json('tests/.local/admin.json', { username:'admin', password }); fs.chmodSync(path.join(root, '.local/admin.json'), 0o600);
        for (const operation of ['login','check','clear','recover']) {
            const result = await cli('session', operation,'--env','local','--role','admin'); assert.equal(result.code, 0, result.logs);
        }
        // Own-session fixture is tested both on success and when the test fails.
        fs.cpSync(path.join(source, 'support/steps/auth'), path.join(root, 'support/steps/auth'), { recursive:true });
        write('tests/support/steps/INDEX.md', '# Steps\n| `auth/login.ts` | 密码登录 | Cookie |\n');
        json('tests/e2e/reuse/flow.json', { ...flow, portal:'password', steps:['support/steps/auth/login.ts'], evidence:{ requiredAttachments:['state','session-cleanup'] } });
        write('tests/e2e/reuse/reuse.spec.ts', `import{test,expect}from'../../support/fixtures/authenticated';test('owned',async({page,loginAs},info)=>{await loginAs();await expect(page.locator('.admin-header__user')).toHaveText('admin');await info.attach('state',{body:'{}',contentType:'application/json'});});`);
        let result = await cli('run',flow.id,'--env','local','--headless'); assert.equal(result.code,0,result.logs);
        const beforeLogout = logoutCount;
        write('tests/e2e/reuse/reuse.spec.ts', `import{test}from'../../support/fixtures/authenticated';test('failure cleanup',async({loginAs})=>{await loginAs();throw new Error('synthetic business failure');});`);
        result = await cli('run',flow.id,'--env','local','--headless'); assert.equal(result.code,1); assert.match(result.logs,/synthetic business failure/);
        assert.equal(logoutCount,beforeLogout+1);
        assert.equal(fs.readdirSync(path.join(root,'.local/sessions/local/admin.recovery')).length,0);
        // Execute the seven real system flow definitions against synthetic protocol endpoints.
        fs.rmSync(path.join(root,'e2e'),{recursive:true});
        for(const name of ['api','e2e','bruno','support']) fs.cpSync(path.join(source,name),path.join(root,name),{recursive:true});
        const originalRegistry = JSON.parse(fs.readFileSync(path.join(source, 'registry.json')));
        originalRegistry.flows = originalRegistry.flows.filter((manifest) => {
            const meta = JSON.parse(fs.readFileSync(path.join(source, manifest)));
            if (!meta.tags.includes('api-business')) return true;
            fs.rmSync(path.join(root, path.dirname(manifest)), { recursive: true, force: true });
            return false;
        });
        fs.rmSync(path.join(root, 'support/steps/api'), { recursive: true, force: true });
        const stepIndex = path.join(root, 'support/steps/INDEX.md');
        fs.writeFileSync(stepIndex, fs.readFileSync(stepIndex, 'utf8').split('\n').filter((line) => !line.startsWith('| `api/')).join('\n'));
        json('tests/registry.json', originalRegistry);
        json('tests/envs/local.json',addresses);
        result=await cli('run','--runner','playwright','--env','local','--headless');assert.equal(result.code,0,result.logs);
        result=await cli('run','--runner','bruno','--env','local');assert.equal(result.code,0,result.logs);
        const doctor=await cli('doctor','--env','local','--json');assert.equal(doctor.code,0,doctor.logs);
        assert.ok(loginCount>=6 && logoutCount>=6);
        assert.equal(fs.readdirSync(path.join(root,'.local/sessions/local/admin.recovery')).length,0);
        console.log('合成服务上的 7 条系统流程通过；不代表真实业务通过。');
    } finally {
        await browser?.close(); server.closeAllConnections(); await new Promise((resolve)=>server.close(resolve));
        fs.rmSync(directory,{recursive:true,force:true});
    }
});
