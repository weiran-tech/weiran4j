import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalog from './history/releases-before-source-workflow.json' with { type: 'json' };
import { blankHandoff, normalizeHandoff, handoffErrors, updateDelivery, acceptanceCommand, deliveryCommand, signedConfirmations, deliveryApprovalErrors, blockerDecision, approvalErrors, approvalCommand } from './handoff.mjs';
import { mergeHandoff } from './handoff-transfer.mjs';
const release = { ...structuredClone(catalog.releases[0]), status: 'finalized' };
const policy = { product: ['pm'], technical: ['dev'] };
const date = '2026-11-23T03:00:00Z';
function formal() {
    const value = blankHandoff(release);
    Object.assign(value, { phase: 'acceptance', productOwner: 'pm', technicalOwner: 'dev', candidateId: release.id + '-rc-' + 'a'.repeat(40), candidateCommit: 'a'.repeat(40), candidateFingerprint: 'b'.repeat(64), candidateUrl: 'https://example.com/candidate', testData: '固定测试数据' });
    value.candidateUrl = `https://example.com/releases/${value.candidateId}/prototype/workflow`;
    value.changes.forEach((item) => Object.assign(item, { state: 'unnecessary', reason: '本期无需研发' }));
    Object.assign(value.changes[0], { state: 'verifying', owner: 'developer', task: 'https://github.com/example/business/issues/1', pr: 'https://github.com/example/business/pull/2', environment: 'https://test.example.com', build: 'build-1' });
    value.changes[0].acceptance.forEach((entry) => Object.assign(entry, { result: 'pass', evidence: 'https://github.com/example/business/issues/1#issuecomment-3' }));
    return value;
}
function comment(body, owner = 'pm', at = date) { return { body, user: { login: owner }, updated_at: at, html_url: 'https://github.com/example/business/issues/1#issuecomment-4' }; }
test('审查中不能直接接单交付，研发与提测检查任务、实现及环境', () => {
    const value = blankHandoff(catalog.releases[0]); value.phase = 'development';
    const errors = handoffErrors(value, catalog.releases[0]); assert.ok(errors.some((text) => text.includes('已定稿'))); assert.ok(errors.some((text) => text.includes('全部改动必须接单')));
    const ready = formal(); ready.changes[0].task = ''; ready.changes[0].pr = ''; ready.changes[0].environment = '';
    assert.ok(handoffErrors(ready, release).some((text) => text.includes('接单需'))); assert.ok(handoffErrors(ready, release).some((text) => text.includes('提测需')));
});
test('产品真实作者确认准确构建和内容，冒充或修改证据立即失效', async () => {
    const value = formal(); const item = value.changes[0];
    const command = await acceptanceCommand(value.version, item);
    const comments = [comment(command)];
    const proof = (await signedConfirmations(value, comments, policy)).acceptances[item.id];
    Object.assign(item, { state: 'accepted', acceptedBy: proof.by, acceptedAt: proof.at, acceptedBuild: proof.build });
    assert.deepEqual(handoffErrors(value, release), []); assert.deepEqual(await deliveryApprovalErrors(value, comments, policy), []);
    assert.ok((await deliveryApprovalErrors(value, [comment(command, 'developer')], policy)).length);
    item.acceptance[0].evidence = 'https://example.com/different-evidence';
    assert.ok((await deliveryApprovalErrors(value, comments, policy)).length);
    item.build = 'build-2'; item.acceptedBuild = 'build-2'; assert.ok((await deliveryApprovalErrors(value, comments, policy)).length);
});
test('换环境或构建会转待复验，不能保留旧验收通过状态', () => {
    const item = formal().changes[0]; Object.assign(item, { state: 'accepted', acceptedBy: 'pm', acceptedAt: date, acceptedBuild: item.build });
    const next = updateDelivery(item, { build: 'build-2' });
    assert.equal(next.state, 'verifying'); assert.equal(next.acceptedBy, ''); assert.ok(next.acceptance.every((entry) => entry.result === 'pending')); assert.ok(next.acceptance.every((entry) => entry.evidence));
    assert.equal(updateDelivery(item, { environment: 'https://next.example.com' }).acceptedBuild, '');
});
test('撤回本人验收或换候选命令不可沿用', async () => {
    const value = formal(); const item = value.changes[0]; const cmd = await acceptanceCommand(value.version, item);
    Object.assign(item, { state: 'accepted', acceptedBy: 'pm', acceptedAt: date, acceptedBuild: item.build });
    const comments = [comment(cmd), comment(`/prototype accept ${value.version} ${item.id} revoked`, 'pm', '2026-11-23T04:00:00Z')];
    assert.ok((await deliveryApprovalErrors(value, comments, policy)).length);
});
test('业务发布需完整记录、准确范围与发布后本人复核，不能伪造交付', async () => {
    const value = formal(); const item = value.changes[0]; const accepted = comment(await acceptanceCommand(value.version, item));
    Object.assign(item, { state: 'accepted', acceptedBy: 'pm', acceptedAt: date, acceptedBuild: item.build }); value.phase = 'delivered';
    assert.ok(handoffErrors(value, release).some((text) => text.includes('发布记录')));
    Object.assign(value.publication, { url: 'https://github.com/example/business/releases/tag/1', environment: 'https://production.example.com', build: 'release-1', publishedBy: 'operator', publishedAt: '2026-11-23T04:00:00Z', rollback: '回退至上一发布', scope: [item.id] });
    const publication = comment(await deliveryCommand(value), 'pm', '2026-11-23T05:00:00Z');
    Object.assign(value.publication, { verifiedBy: 'pm', verifiedAt: publication.updated_at });
    assert.deepEqual(handoffErrors(value, release), []); assert.deepEqual(await deliveryApprovalErrors(value, [accepted, publication], policy), []);
    value.publication.scope = []; assert.ok(handoffErrors(value, release).some((text) => text.includes('发布范围'))); assert.ok((await deliveryApprovalErrors(value, [accepted, publication], policy)).length);
});
test('无需发布和暂缓也需明确去向，旧记录迁移不补造确认', () => {
    const value = formal(); value.changes[0].state = 'deferred'; value.changes[0].reason = '等待下期';
    assert.ok(handoffErrors(value, release).some((text) => text.includes('后续任务')));
    const old = { ...blankHandoff(release), schemaVersion: 1 }; delete old.publication;
    const migrated = normalizeHandoff(old, release); assert.equal(migrated.schemaVersion, 2); assert.equal(migrated.publication.verifiedBy, '');
    const invalid = structuredClone(old); invalid.changes.push(invalid.changes[0]); assert.throws(() => normalizeHandoff(invalid, release), /CHG/);
});
test('交接按 CHG 三方合并；同字段冲突保留本机，显式选择后采用传入', () => {
    const base = formal(), mine = structuredClone(base), remote = structuredClone(base);
    mine.changes[0].owner = 'mine'; remote.changes[1].reason = '团队新结论';
    const merged = mergeHandoff(base, mine, remote); assert.equal(merged.conflicts.length, 0); assert.equal(merged.value.changes[0].owner, 'mine'); assert.equal(merged.value.changes[1].reason, '团队新结论');
    remote.changes[0].owner = 'other'; const result = mergeHandoff(base, mine, remote);
    assert.equal(result.conflicts.length, 1); const path = result.conflicts[0].path;
    assert.equal(mergeHandoff(base, mine, remote, { [path]: 'incoming' }).value.changes[0].owner, 'other');
});
test('关闭阻塞需要产品决策证据；最终批准必须晚于结论', () => {
    const issue = { number: 9, state: 'closed', closed_at: date };
    assert.ok(blockerDecision(issue, [], 'pm', release.id).errors.length);
    const body = `/prototype resolve ${release.id} deferred\n原因：下期处理\n证据：https://example.com/proof\n承接：https://github.com/example/business/issues/8`;
    assert.ok(blockerDecision(issue, [comment(body, 'developer')], 'pm', release.id).errors.length);
    const decision = blockerDecision(issue, [comment(body)], 'pm', release.id); assert.deepEqual(decision.errors, []);
    const candidate = { version: release.id + '-rc-' + 'a'.repeat(40), fingerprint: 'b'.repeat(64) };
    const comments = [comment(approvalCommand('product', candidate), 'pm', '2026-11-23T02:00:00Z'), comment(approvalCommand('technical', candidate), 'dev')];
    assert.ok(approvalErrors({ productOwner: 'pm', technicalOwner: 'dev' }, candidate, comments, policy, decision.at).some((text) => text.includes('晚于')));
});

test('四阶段展示保留旧记录原值，业务研发和待验收映射已定稿', async () => {
    const { workflowStage } = await import('./handoff.mjs');
    const value = formal();
    for (const phase of ['development', 'acceptance']) { value.phase = phase; assert.equal(workflowStage(value, release), 'finalized'); assert.equal(value.phase, phase); }
    value.phase = 'delivered'; assert.equal(workflowStage(value, release), 'accepted');
    value.phase = 'review'; assert.equal(workflowStage(value, { ...release, status: 'review' }), 'review');
});
test('需求验收独立于业务发布，空发布及发布草稿均不阻塞，但本人验收不能缺失', async () => {
    const value = formal(); const item = value.changes[0]; const cmd = await acceptanceCommand(value.version, item);
    Object.assign(item, { state: 'accepted', acceptedBy: 'pm', acceptedAt: date, acceptedBuild: item.build }); value.phase = 'accepted';
    assert.deepEqual(handoffErrors(value, release), []);
    assert.deepEqual(await deliveryApprovalErrors(value, [comment(cmd)], policy), []);
    value.publication.url = 'https://example.com/release-draft';
    assert.deepEqual(handoffErrors(value, release), []);
    assert.ok((await deliveryApprovalErrors(value, [], policy)).length);
    value.publication.verifiedBy = 'pm'; assert.ok(handoffErrors(value, release).some((text) => text.includes('发布记录')));
});
test('完成需求验收不能隐藏未完成改动，暂缓仍需原因与承接', () => {
    const value = formal(); value.phase = 'accepted';
    assert.ok(handoffErrors(value, release).some((text) => text.includes('全部改动')));
    Object.assign(value.changes[0], { state: 'deferred', reason: '下期', followUp: 'https://example.com/task' });
    assert.deepEqual(handoffErrors(value, release), []);
});
test('统一交接正文含业务规则和原验收条件，摘要保留暂缓去向', async () => {
    const { engineeringSummary, handoffMarkdown } = await import('./handoff.mjs');
    const value = formal();
    Object.assign(value.changes[0], { state: 'deferred', reason: '下期实施', followUp: 'https://example.com/next' });
    const summary = engineeringSummary(value, release);
    assert.ok(summary.includes(release.changes[0].rules[0])); assert.ok(summary.includes(release.changes[0].acceptance[0])); assert.ok(summary.includes('下期实施')); assert.ok(summary.includes('https://example.com/next'));
    assert.ok(handoffMarkdown(value, release).includes(summary));
});
