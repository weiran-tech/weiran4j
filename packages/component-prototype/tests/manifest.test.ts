import { describe, expect, it } from 'vitest';
import { assembleManifest, canonicalJson } from '../src/manifest';
const index = { current: 'v1.1', activeVersion: 'v1.1' };
const files = {
    'prototype/versions/v1.0/version.json': { id: 'v1.0', status: 'completed', baseline: null },
    'prototype/versions/v1.1/version.json': { id: 'v1.1', status: 'in_progress', baseline: 'v1.0' },
    'prototype/versions/v1.1/changes/mobile-messages.json': { pageId: 'mobile-messages', changes: [{ id: 'CHG-010' }, { id: 'CHG-002' }] },
};
describe('拆分版本组装', () => {
    it('自动发现版本，组装同页多个CHG并固定排序，初始基线允许无改动文件', () => {
        const manifest = assembleManifest(index, files);
        expect(manifest.releases.map(item => item.id)).toEqual(['v1.1', 'v1.0']);
        expect(manifest.releases[0]?.changes).toEqual([{ id: 'CHG-002', pageId: 'mobile-messages' }, { id: 'CHG-010', pageId: 'mobile-messages' }]);
        expect(manifest.releases[1]?.changes).toEqual([]);
        expect(assembleManifest(index, Object.fromEntries(Object.entries(files).reverse()))).toEqual(manifest);
    });
    it('拒绝页面文件名不匹配、重复pageId与孤立版本改动', () => {
        expect(() => assembleManifest(index, { ...files, 'prototype/versions/v1.1/changes/other.json': { pageId: 'mobile-messages', changes: [{ id: 'CHG-011' }] } })).toThrow('分组与文件名');
        expect(() => assembleManifest(index, { ...files, 'prototype/versions/v1.2/changes/a.json': { pageId: 'a', changes: [{ id: 'CHG-001' }] } })).toThrow('缺少版本');
        expect(() => assembleManifest(index, { ...files, 'prototype/versions/v1.1/changes/a.json': { pageId: 'a', changes: [{ pageId: 'b' }] } })).toThrow('继承 pageId');
    });
    it('对象字段顺序不算冻结版本变动，内容变化仍有差异', () => {
        expect(canonicalJson({ id: 'v1.0', changes: [] })).toBe(canonicalJson({ changes: [], id: 'v1.0' }));
        expect(canonicalJson({ changes: [{ after: '旧' }] })).not.toBe(canonicalJson({ changes: [{ after: '新' }] }));
    });
});
