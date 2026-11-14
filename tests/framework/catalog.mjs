import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { inside, readJson } from "./core.mjs";
import { withFileLock, workflowError } from "./utils.mjs";

const require = createRequire(import.meta.url);
export function runHistory(root, { id, env } = {}) {
    const directory = path.join(root, '.artifacts/runs');
    const items = [];
    for (const name of fs.existsSync(directory) ? fs.readdirSync(directory) : []) {
        if (!/^\d{17}-[a-f0-9]{8}$/.test(name)) continue;
        try {
            const run = readJson(inside(root, `.artifacts/runs/${name}/run.json`));
            if ((id && run.flow.id !== id) || (env && run.environment !== env)) continue;
            const checked = readJson(inside(root, `.artifacts/runs/${name}/verification.json`));
            const latestFile = path.join(root, `.artifacts/runs/${name}/reverification.json`);
            const latest = fs.existsSync(latestFile) ? readJson(inside(root, `.artifacts/runs/${name}/reverification.json`)) : checked;
            const passed = run.status === 'passed' && run.exitCode === 0 && checked.runId === run.runId && latest.runId === run.runId && checked.flowId === run.flow.id && latest.flowId === run.flow.id
                && checked.ok === true && checked.complete === true && latest.ok === true && latest.complete === true;
            items.push({ runId: run.runId, flowId: run.flow.id, environment: run.environment,
                startedAt: run.startedAt, durationMs: run.durationMs ?? 0, processStatus: run.status, exitCode: run.exitCode,
                verified: passed, complete: passed, originalVerified: checked.ok === true && checked.complete === true, failureKind: latest.failureKind ?? checked.failureKind ?? null });
        } catch {
            // running/损坏记录仍展示，不能因缺少 verification 消失或算通过。
            try {
                const run = readJson(inside(root, `.artifacts/runs/${name}/run.json`));
                if ((id && run.flow.id !== id) || (env && run.environment !== env)) continue;
                items.push({ runId: run.runId, flowId: run.flow.id, environment: run.environment,
                    startedAt: run.startedAt, durationMs: run.durationMs ?? 0, processStatus: run.status, verified: false, complete: false, failureKind: 'VERIFICATION' });
            } catch { /* 无法归属的损坏记录不计入任何流程，原文件保留。 */ }
        }
    }
    return items.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}
export function feedbackList(root, filters = {}) {
    const file = path.join(root, '.artifacts/feedback.jsonl');
    if (!fs.existsSync(file)) return [];
    const lines = fs.readFileSync(inside(root, '.artifacts/feedback.jsonl'), 'utf8').split('\n').filter(Boolean);
    let records;
    try { records = lines.map((line) => JSON.parse(line)); }
    catch { throw workflowError('CONFIG', '反馈日志损坏，请核对原文件；未忽略任何记录'); }
    return records.filter((item) => (!filters.id || item.flowId === filters.id) && (!filters.env || item.environment === filters.env)
        && (!filters.verdict || item.verdict === filters.verdict)
        && (!filters.runId || item.runId === filters.runId));
}
export function recordFeedback(root, flows, id, { verdict, runId, note = '', env } = {}) {
    if (!flows.some((flow) => flow.id === id) || !['useful', 'stale', 'wrong'].includes(verdict)) throw workflowError('CONFIG', '流程或反馈 verdict 无效');
    if (!/^\d{17}-[a-f0-9]{8}$/.test(runId ?? '')) throw workflowError('CONFIG', '反馈必须绑定有效 runId');
    const run = runHistory(root, { id }).find((item) => item.runId === runId);
    if (!run || (env && env !== run.environment)) throw workflowError('CONFIG', '反馈与运行的流程或环境不匹配');
    if (verdict === 'useful' && (!run.verified || !run.complete)) throw workflowError('CONFIG', 'useful 需要完整证据复核通过的运行');
    if (typeof note !== 'string' || note.length > 2000) throw workflowError('CONFIG', '反馈说明最多 2000 字符，请勿填写凭据');
    const record = { flowId: id, runId, environment: run.environment, verdict, note, at: new Date().toISOString() };
    return withFileLock(root, 'feedback', () => {
        const directory = path.join(root, '.artifacts');
        fs.mkdirSync(directory, { recursive: true });
        // 校验已有文件及链接边界，拒绝把日志写出 tests。
        inside(root, '.artifacts');
        if (fs.existsSync(path.join(directory, 'feedback.jsonl'))) inside(root, '.artifacts/feedback.jsonl');
        feedbackList(root);
        fs.appendFileSync(path.join(directory, 'feedback.jsonl'), JSON.stringify(record) + '\n', { mode: 0o600 });
        return record;
    });
}
export function statistics(root, filters = {}) {
    const runs = runHistory(root, filters), feedback = feedbackList(root, filters);
    const groups = new Map();
    for (const run of runs) {
        if (!groups.has(run.flowId)) groups.set(run.flowId, { flowId: run.flowId, runs: 0, passed: 0, failed: 0, totalMs: 0, last: run,
            feedback: { useful: 0, stale: 0, wrong: 0 } });
        const group = groups.get(run.flowId);
        group.runs++;
        if (run.verified && run.complete) group.passed++;
        else group.failed++;
        group.totalMs += Number(run.durationMs) || 0;
    }
    for (const item of feedback) {
        const group = groups.get(item.flowId);
        if (group && Object.hasOwn(group.feedback, item.verdict)) group.feedback[item.verdict]++;
    }
    return [...groups.values()].sort((a, b) => a.flowId.localeCompare(b.flowId)).map((group) => ({ ...group,
        passRate: group.passed / group.runs, avgMs: Math.round(group.totalMs / group.runs) }));
}

export function lintFlows(root, flows) {
    const ts = require('typescript'), issues = [];
    const owners = new Map();
    const localSources = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
        if (['node_modules', '.local', '.artifacts', '.git'].includes(item.name)) return [];
        const file = path.join(directory, item.name);
        if (item.isDirectory()) return localSources(file);
        return /\.[cm]?[jt]sx?$/.test(item.name) ? [inside(root, path.relative(root, file))] : [];
    });
    for (const flow of flows.filter((flow) => flow.runner === 'playwright')) {
        const file = inside(root, flow.entry), text = fs.readFileSync(file, 'utf8');
        if (text.split('\n').length > 250 && !flow.modularityNote) issues.push({ level: 'error', flowId: flow.id, check: 'size', message: 'spec 超过 250 行，应抽取共享步骤或提供 modularityNote' });
        for (const source of localSources(path.dirname(file))) {
            const tree = ts.createSourceFile(source, fs.readFileSync(source, 'utf8'), ts.ScriptTarget.Latest, true);
            const visit = (node) => {
                if (ts.isFunctionDeclaration(node) && node.name) {
                    const name = node.name.text;
                    if (!owners.has(name)) owners.set(name, new Map());
                    owners.get(name).set(source, flow.id);
                }
                ts.forEachChild(node, visit);
            };
            visit(tree);
        }
    }
    for (const [name, files] of owners) if (new Set(files.values()).size > 1) issues.push({ level: 'warning', flowId: [...new Set(files.values())].join(', '), check: 'duplicate-helper', message: `重复 helper 名称 ${name}，请确认是否应抽取共享步骤` });
    return issues;
}
