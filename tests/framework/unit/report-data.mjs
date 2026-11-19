import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwright = createRequire(require.resolve('@playwright/test/package.json'));
export const serveFolder = playwright('playwright-core/lib/coreBundle').utils.serveFolder;
const { yauzl } = playwright('playwright-core/lib/utilsBundle');
export async function reportData(file) {
    const html = fs.readFileSync(file, 'utf8');
    const encoded = html.match(/<template id="playwrightReportBase64">data:application\/zip;base64,([^<]+)/)?.[1];
    if (!encoded) throw new Error('不是 Playwright 原生 HTML 报告');
    return await new Promise((resolve, reject) => {
        yauzl.fromBuffer(Buffer.from(encoded, 'base64'), { lazyEntries: true }, (failure, zip) => {
            if (failure) return reject(failure);
            const data = {};
            zip.on('error', reject); zip.on('end', () => resolve(data));
            zip.on('entry', (entry) => zip.openReadStream(entry, (error, stream) => {
                if (error) return reject(error);
                const chunks = [];
                stream.on('error', reject); stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => {
                    try { data[entry.fileName] = JSON.parse(Buffer.concat(chunks).toString('utf8')); zip.readEntry(); }
                    catch (error) { reject(error); }
                });
            }));
            zip.readEntry();
        });
    });
}
