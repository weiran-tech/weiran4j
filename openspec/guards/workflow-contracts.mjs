import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 有限的废止肯定断言模式；不是自然语言语义校验器。 */
export function staleAssertions(text) {
  return text.split('\n').flatMap((line, index) => {
    if (/不再兼容|禁止|不要照搬|历史(?:说明|示例|归档)/.test(line)) return [];
    const stale = /(?:code|成功码).{0,16}(?:是字符串|为字符串)|本仓库没有\s*(?:migration|Flyway)|前端硬编码.{0,40}无后端表|包络由\s*wuli3|必须.{0,20}weiran-v1.{0,20}核对|\*\*API Design\*\*:Hono|\*\*Database Design\*\*:Drizzle|pnpm --filter @zenith\/shared build|每层结束即 merge 回主干/.test(line);
    return stale ? [{ line: index + 1, text: line.trim() }] : [];
  });
}

export function promptSources(root) {
  const base = 'openspec/schemas/devops-workflow';
  return ['openspec/config.yaml', `${base}/schema.yaml`, ...readdirSync(join(root, base, 'templates')).filter((f) => f.endsWith('.md')).map((f) => `${base}/templates/${f}`)];
}

export default {
  id: 'workflow-contracts',
  watches: ['openspec/config.yaml', 'openspec/schemas/devops-workflow/'],
  run({ ROOT, err }) {
    for (const file of promptSources(ROOT)) {
      for (const finding of staleAssertions(readFileSync(join(ROOT, file), 'utf8'))) {
        err('REPO/workflow-contract-stale', file, `现行注入源含废止实施要求：${finding.text}`, finding.line);
      }
    }
  },
};
