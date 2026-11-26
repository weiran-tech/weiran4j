import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(process.argv[2] ?? 'dist');
function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = resolve(directory, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (entry.name.endsWith('.d.ts')) writeFileSync(file, readFileSync(file, 'utf8').replace(/^import ['"][^'"]+\.css['"];?\s*$/gm, ''));
    }
}
visit(root);
