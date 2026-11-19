import fs from 'node:fs';
import path from 'node:path';
import { inside, readJson } from './core.mjs';
import { buildReportModel, nativeReportLibrary } from './report-model.mjs';

const validId = (id) => /^\d{17}-[a-f0-9]{8}$/.test(id ?? '');
function available(root, relative) {
    try { return fs.statSync(inside(root, relative)).isFile(); } catch { return false; }
}

export async function writeBatchReport(root, batch) {
    if (!validId(batch.batchId) || !Array.isArray(batch.items)) throw new Error('批次记录无效');
    const directory = inside(root, `.artifacts/batches/${batch.batchId}`);
    const folder = path.join(directory, 'report');
    if (fs.existsSync(folder)) {
        if (fs.lstatSync(folder).isSymbolicLink()) throw new Error('报告目录不能为符号链接');
        inside(root, `.artifacts/batches/${batch.batchId}/report`);
    }
    const { suite, config, result, issues } = buildReportModel(root, batch);
    return writeNativeReport(root, folder, { suite, config, result }, `weiran4j · ${batch.batchId}`,
        [...(batch.status !== 'passed' ? [`批次 ${batch.status}：并非全部流程完整通过。请查看 execution 项目中的阻塞、未执行和严格复核记录。`] : []), ...issues]);
}

export async function writeNativeReport(root, folder, { suite, config, result }, title, issues = []) {
    const { HtmlReporter } = nativeReportLibrary();
    // 原生 reporter 的输出目录环境变量优先于配置，必须固定到当前批次，防止覆盖其他目录。
    const overrides = { PLAYWRIGHT_HTML_OUTPUT_DIR: folder, PLAYWRIGHT_HTML_REPORT: folder, PLAYWRIGHT_HTML_OPEN: 'never',
        PW_TEST_HTML_REPORT_OPEN: 'never', PLAYWRIGHT_HTML_ATTACHMENTS_BASE_URL: 'data/', PLAYWRIGHT_HTML_TITLE: title };
    const original = Object.fromEntries(Object.keys(overrides).map((name) => [name, process.env[name]]));
    try {
        Object.assign(process.env, overrides);
        const reporter = new HtmlReporter({ configDir: root, outputFolder: folder, open: 'never', noSnippets: true, noCopyPrompt: true, _mode: 'merge' });
        reporter.onConfigure(config); reporter.onBegin(suite);
        for (const message of issues) reporter.onError({ message });
        await reporter.onEnd(result);
    } finally {
        for (const [name, value] of Object.entries(original)) {
            if (value === undefined) delete process.env[name]; else process.env[name] = value;
        }
    }
    return path.join(folder, 'index.html');
}

export function locateReport(root, id, { env } = {}) {
    const batches = path.join(root, '.artifacts/batches');
    const records = () => fs.existsSync(batches) ? fs.readdirSync(batches).filter(validId).sort().reverse() : [];
    const batchRecord = (name) => {
        try {
            const file = inside(root, `.artifacts/batches/${name}/batch.json`);
            const record = readJson(file);
            return record.batchId === name && Array.isArray(record.items) && (!env || record.environment === env) ? record : undefined;
        } catch { return undefined; }
    };
    if (!id) {
        const latest = records().find((name) => batchRecord(name));
        if (!latest) throw new Error('没有可查看的批次报告，请先执行测试');
        id = latest;
    }
    if (!validId(id)) throw new Error('report 需要有效 batchId 或 runId');
    if (batchRecord(id)) return { kind: 'batch', id, directory: path.join(inside(root, `.artifacts/batches/${id}`), 'report') };
    // 优先将 runId 定位到统一批次，历史孤立 HTML 仍可查看。
    for (const name of records()) if (batchRecord(name)?.items.some((item) => item.runId === id)) {
        return { kind: 'batch', id: name, directory: path.join(inside(root, `.artifacts/batches/${name}`), 'report') };
    }
    if (available(root, `.artifacts/runs/${id}/report/index.html`)) return { kind: 'run', id, directory: inside(root, `.artifacts/runs/${id}/report`) };
    throw new Error('未找到已有批次报告或该运行所属批次');
}
