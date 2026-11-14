import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import guard, { staleAssertions, promptSources } from '../guards/workflow-contracts.mjs';

test('已知错误肯定断言被拒，历史和禁止说明允许', () => {
  for (const value of ['code 是字符串 "0"', '本仓库没有 Flyway/Liquibase', '统一包络由 wuli3 产生', '**API Design**:Hono 路由']) {
    assert.equal(staleAssertions(value).length, 1, value);
    assert.equal(staleAssertions(`历史说明：${value}`).length, 0);
    assert.equal(staleAssertions(`不要照搬：${value}`).length, 0);
  }
});

test('config、schema、template 的废止断言均定位来源', () => {
  const root = mkdtempSync(join(tmpdir(), 'weiran-prompt-'));
  try {
    const dir = 'openspec/schemas/devops-workflow';
    mkdirSync(join(root, dir, 'templates'), { recursive: true });
    const sources = ['openspec/config.yaml', `${dir}/schema.yaml`, `${dir}/templates/design.md`];
    for (const file of sources) writeFileSync(join(root, file), 'code 是字符串 "0"');
    const found = [];
    guard.run({ ROOT: root, err: (...args) => found.push(args) });
    assert.deepEqual(found.map((x) => x[1]), sources);
    for (const file of sources) writeFileSync(join(root, file), '禁止照搬 code 是字符串 "0"');
    guard.run({ ROOT: root, err: () => assert.fail('否定说明被误判') });
  } finally { rmSync(root, { recursive: true }); }
});

test('实际 CLI 全部 artifact 的组合输出保持当前事实', () => {
  const root = mkdtempSync(join(tmpdir(), 'weiran-cli-prompt-'));
  try {
    const change = 'prompt-contract-probe';
    mkdirSync(join(root, 'openspec'), { recursive: true });
    cpSync('openspec/config.yaml', join(root, 'openspec/config.yaml'));
    cpSync('openspec/schemas', join(root, 'openspec/schemas'), { recursive: true });
    execFileSync('openspec', ['new', 'change', change, '--schema', 'devops-workflow'], { cwd: root, stdio: 'pipe' });
    const base = join(root, 'openspec/changes', change);
    mkdirSync(join(base, 'exec'), { recursive: true });
    mkdirSync(join(base, 'specs/probe'), { recursive: true });
    for (const file of ['interview.md', 'explore.md', 'proposal.md', 'design.md', 'exec/plan.md', 'specs/probe/spec.md']) writeFileSync(join(base, file), '# 探针\n');
    writeFileSync(join(base, 'tasks.md'), '- [ ] 1.1 提示词探针\n');
    for (const id of ['interview', 'explore', 'proposal', 'specs', 'design', 'tasks', 'exec-plan', 'verify', 'apply']) {
      const output = JSON.parse(execFileSync('openspec', ['instructions', id, '--change', change, '--json'], { cwd: root, encoding: 'utf8' }));
      const prompt = [output.context, output.instruction, output.rules, output.template].flat().filter(Boolean).join('\n');
      assert.deepEqual(staleAssertions(prompt), [], id);
      assert.match(prompt, /Java/); assert.match(prompt, /Flyway/); assert.match(prompt, /数字 0/);
      if (id === 'design') { assert.match(prompt, /DS-1/); assert.match(prompt, /CP-15/); assert.match(prompt, /sys_menu/); }
    }
    const config = join(root, 'openspec/config.yaml');
    writeFileSync(config, readFileSync(config, 'utf8').replace('成功 code 为数字 0', '成功 code 是字符串 "0"'));
    const wrong = JSON.parse(execFileSync('openspec', ['instructions', 'design', '--change', change, '--json'], { cwd: root, encoding: 'utf8' }));
    assert.ok(staleAssertions(wrong.context).length > 0, '实际注入错误必须被发现');
  } finally { rmSync(root, { recursive: true }); }
  for (const file of promptSources(process.cwd())) assert.equal(staleAssertions(readFileSync(file, 'utf8')).length, 0, file);
});
