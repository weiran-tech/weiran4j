import { beforeEach, expect, it } from 'vitest';
import { createReviewStore, productPages, parallelConflicts, pageHref, type Release } from '../src/core';
const page = { id: 'home', title: '页面', path: '/home', module: '示例', platform: 'manage' as const };
const version: Release = { id: 'v1.1', title: '测试版本', status: 'in_progress', baseline: 'v1.0', date: '2026-11-26', goal: '', changes: [] };
beforeEach(() => localStorage.clear());
function store(key = 'project-a', release = version) {
    return createReviewStore({ storage: localStorage, storageKey: key, releases: () => [release], pagesForReview: () => [page] });
}
it('版本冻结、页面关联和命名空间隔离在存储边界生效', () => {
    const a = store(); const b = store('project-b');
    const note = a.addReview(version.id, { author: '产品', text: '检查间距', pageId: 'home' });
    expect(b.readPrototype().notes).toEqual({});
    expect(() => a.addReview(version.id, { author: '产品', text: '检查', pageId: 'wrong' })).toThrow('不属于');
    expect(() => a.addReview(version.id, { author: '产品', text: '检查', pageId: 'home', changeId: 'CHG-999' })).toThrow('不匹配');
    const frozen = store('project-a', { ...version, status: 'completed' });
    expect(() => frozen.updateReview(version.id, note.id, { author: '产品', text: '改写', pageId: 'home' })).toThrow('进行中');
    expect(() => frozen.deleteReview(version.id, note.id)).toThrow('进行中');
    expect(frozen.readPrototype().notes[version.id]).toHaveLength(1);
});
it('存储损坏和配额失败保留原始数据，不返回虚假成功', () => {
    localStorage.setItem('project-a', '{broken');
    expect(() => store().addReview(version.id, { author: '产品', text: '检查', pageId: '' })).toThrow('损坏');
    expect(localStorage.getItem('project-a')).toBe('{broken');
    const bad = createReviewStore({ storage: { ...localStorage, getItem: () => null, setItem: () => { throw new Error('quota'); } }, storageKey: 'bad', releases: () => [version], pagesForReview: () => [page] });
    expect(() => bad.addReview(version.id, { author: '产品', text: '检查', pageId: '' })).toThrow('quota');
});
it('旧单图记录可编辑，删除旧迁移记录后不会复活', () => {
    const legacy = { id: 'legacy:one', versionId: version.id, pageId: '', author: '旧记录', text: '检查', date: '2026-11-25', image: 'data:image/png;base64,YQ==' };
    const a = createReviewStore({ storage: localStorage, storageKey: 'legacy', releases: () => [version], pagesForReview: () => [page], legacyNotes: () => [legacy] });
    const saved = a.updateReview(version.id, legacy.id, { ...legacy, text: '已编辑' });
    expect(saved.id).toBe(legacy.id); expect(saved.images).toEqual([legacy.image]);
    a.deleteReview(version.id, legacy.id);
    expect(a.readPrototype().notes[version.id]).toEqual([]);
});
it('同名双端页面不互相覆盖，兄弟版本不混入产品，历史不回退当前页面', () => {
    const baseline: Release = { ...version, id: 'v1.0', baseline: null, status: 'completed' };
    const pages = [page, { ...page, platform: 'mobile' as const }];
    expect(productPages(version, [baseline, version], { 'v1.0': pages })).toHaveLength(2);
    const change = { id: 'CHG-001', type: 'modify' as const, title: '修改', pageId: 'home', platform: 'manage' as const, pageTitle: '页面', page: '/home', module: '示例', before: '', after: '', rules: [], acceptance: [] };
    expect(parallelConflicts({ ...version, changes: [change] }, [{ ...version, id: 'v1.2', changes: [{ ...change, platform: 'mobile' }] }])).toEqual([]);
    expect(pageHref(baseline, '/home', version.id)).toBeNull();
});
