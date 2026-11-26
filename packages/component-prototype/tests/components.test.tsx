import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createReviewAuthors, createReviewStore, RpPageReview, RpPageDirectory, RpQuickSearch, RpReviewForm, type Release } from '../src';
const version: Release = { id: 'v1.1', title: '示例', status: 'in_progress', baseline: null, date: '2026-11-26', goal: '', changes: [] };
const page = { id: 'home', title: '首页', path: '/home', module: '示例', platform: 'manage' as const, files: [] };
function adapters() {
    const actions = createReviewStore({ storage: localStorage, storageKey: 'test-reviews', releases: () => [version], pagesForReview: () => [page] });
    const authors = createReviewAuthors(localStorage, 'test-authors', () => actions.readPrototype().notes);
    authors.rememberReviewAuthor('产品');
    return { actions, authorsStore: authors };
}
it('阿琅表单默认最近建议人，可保存并删除评审点', async () => {
    const props = adapters(); const saved = vi.fn();
    const view = render(<RpReviewForm {...props} version={version} pages={[page]} initialPage={page} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText('评审意见'), { target: { value: '调整首页间距' } });
    fireEvent.click(screen.getByRole('button', { name: '保存评审备注' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    const note = props.actions.readPrototype().notes[version.id]![0]!;
    expect(note).toMatchObject({ author: '产品', pageId: 'home' });
    view.unmount();
    render(<RpReviewForm {...props} version={version} pages={[page]} initialNote={note} />);
    fireEvent.click(screen.getByRole('button', { name: '删除评审点' }));
    expect(props.actions.readPrototype().notes[version.id]).toHaveLength(0);
});
it('保存失败保留输入并给出持续错误', async () => {
    const props = adapters();
    render(<RpReviewForm {...props} actions={{ ...props.actions, addReview: () => { throw new Error('存储已满'); } }} version={version} pages={[page]} />);
    fireEvent.change(screen.getByLabelText('评审意见'), { target: { value: '不能丢失' } });
    fireEvent.click(screen.getByRole('button', { name: '保存评审备注' }));
    expect(await screen.findByText('存储已满')).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('评审意见')).toHaveValue('不能丢失');
});
it('搜索只消费调用方页面，锁屏不响应快捷键', () => {
    const navigate = vi.fn();
    const pages = [{ id: 'a', title: '首页', path: '/home', platform: 'manage', keywords: '用户' }];
    const view = render(<RpQuickSearch pages={pages} onNavigate={navigate} locked />);
    fireEvent.keyDown(window, { key: 'p', metaKey: true });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    view.rerender(<RpQuickSearch pages={pages} onNavigate={navigate} />);
    fireEvent.keyDown(window, { key: 'p', metaKey: true });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/home');
});
it('目录显示空结果并支持过滤与清空，历史缺失链接不冒充当前页面', () => {
    render(<RpPageDirectory version="v1.0" full pages={[{ id: 'one', title: '历史页面', path: '/old', module: '历史', changes: [], unavailable: '缺少历史快照' }]} />);
    expect(screen.getByText('缺少历史快照')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索页面'), { target: { value: '不存在' } });
    expect(screen.getByText('没有匹配的页面')).toBeInTheDocument();
});
it('页面浮层锁屏隐藏，已完结版本只能查看', () => {
    const props = adapters();
    const view = render(<RpPageReview {...props} release={version} page={page} pages={[page]} notes={[]} reviewPath="/reviews" locked />);
    expect(screen.queryByRole('button', { name: '新增评审' })).not.toBeInTheDocument();
    view.rerender(<RpPageReview {...props} release={{ ...version, status: 'completed' }} page={page} pages={[page]} notes={[]} reviewPath="/reviews" />);
    fireEvent.click(screen.getByRole('button', { name: '新增评审' }));
    expect(screen.queryByRole('button', { name: '保存评审备注' })).not.toBeInTheDocument();
});

it('版本整体评审把 Semi 的空页面值规范成空字符串，刷新后仍可读取', async () => {
    const props = adapters();
    render(<RpReviewForm {...props} version={version} pages={[page]} />);
    fireEvent.change(screen.getByLabelText('评审意见'), { target: { value: '整体布局检查' } });
    fireEvent.click(screen.getByRole('button', { name: '保存评审备注' }));
    await waitFor(() => expect(props.actions.readPrototype().notes[version.id]).toHaveLength(1));
    expect(props.actions.readPrototype().notes[version.id]![0]!.pageId).toBe('');
});
