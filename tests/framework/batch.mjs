import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeJson } from "./core.mjs";

// 一次选择对应一个批次；每条真实执行仍保留独立 runId 和原生报告。
export async function runBatch(root, flows, { prepare, run, environment = 'local', dryRun = false, shouldStop = () => false }) {
    const batchId = `${new Date().toISOString().replace(/\D/g, '')}-${randomUUID().slice(0, 8)}`;
    const file = path.join(root, '.artifacts/batches', batchId, 'batch.json');
    const batch = { batchId, startedAt: new Date().toISOString(), status: 'running', environment, dryRun,
        items: flows.map((flow) => ({ flowId: flow.id, status: flow.blockedReason ? 'blocked' : 'pending',
            executed: false, ...(flow.blockedReason ? { reason: flow.blockedReason, failureKind: 'ENVIRONMENT' } : {}) })) };
    const prepared = new Map();
    for (const [index, flow] of flows.entries()) {
        if (flow.blockedReason) continue;
        try { prepared.set(index, prepare(flow)); }
        catch (error) { Object.assign(batch.items[index], { status: 'failed', phase: 'preparation', reason: error.message, failureKind: error.code ?? 'CONFIG' }); }
    }
    // 配置错误时不执行其他流程，避免参数误配后发生业务写入；阻塞项则单列。
    const invalid = batch.items.some((item) => item.phase === 'preparation');
    const save = () => {
        batch.counts = { selected: batch.items.length, executed: batch.items.filter((item) => item.executed).length,
            ...Object.fromEntries(['passed', 'failed', 'blocked', 'skipped', 'planned', 'pending', 'running'].map((status) => [status, batch.items.filter((item) => item.status === status).length])) };
        if (!dryRun) writeJson(file, batch);
    };
    save();
    for (const [index, flow] of flows.entries()) {
        const item = batch.items[index];
        if (item.status !== 'pending') continue;
        if (invalid || shouldStop()) {
            Object.assign(item, { status: 'skipped', reason: invalid ? '批次准备失败，未启动执行' : '批次超时或取消，未启动执行' });
            save(); continue;
        }
        const execution = prepared.get(index);
        Object.assign(item, { status: 'running', runId: dryRun ? undefined : execution.runId }); save();
        try {
            const result = await run(flow, execution);
            item.status = dryRun ? 'planned' : result.ok ? 'passed' : 'failed';
            if (result.failureKind) item.failureKind = result.failureKind;
        } catch (error) {
            Object.assign(item, { status: 'failed', reason: error.message, failureKind: error.code ?? 'EXECUTION' });
        }
        item.executed = !dryRun && fs.existsSync(path.join(execution.directory, 'run.json'));
        save();
    }
    batch.ok = batch.items.every((item) => item.status === (dryRun ? 'planned' : 'passed'));
    batch.status = batch.ok ? (dryRun ? 'planned' : 'passed') : 'failed';
    batch.finishedAt = new Date().toISOString(); save();
    return { ...batch, ...(dryRun ? {} : { artifactFile: file }) };
}
