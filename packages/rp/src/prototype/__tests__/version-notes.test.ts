import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { readVersionNotes, saveVersionNote, versionNoteBundle, openVersionNotebook, exportVersionNotes, installVersionNotesShortcut, type VersionNote } from '../version-notes';
const record = (version: string, id: string): VersionNote => ({ id, version, platform: 'mobile', pageId: 'orders', title: '订单', page: '/mobile/#/orders', kind: 'review', introduction: '', remark: '检查退款失败', image: 'data:image/png;base64,aW1hZ2U=', createdAt: '2026-11-24' });
beforeEach(() => { localStorage.clear(); vi.spyOn(window, 'confirm').mockReturnValue(true); Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } }); });
afterEach(() => { const close = screen.queryByRole('button', { name: '关闭' }); if (close) fireEvent.click(close); vi.restoreAllMocks(); });
test('图片和评审按版本保存，批量输出不混入其他版本', () => {
    saveVersionNote(record('v0.8', 'one')); localStorage.setItem('prototype_version_notes_v1_v0.9', JSON.stringify([record('v0.9', 'two')]));
    const bundle = versionNoteBundle({ version: 'v0.8', pages: [{ platform: 'mobile', pageId: 'orders', title: '订单', path: '/mobile/#/orders' }] });
    expect(bundle.notes.map((item) => item.id)).toEqual(['one']);
    expect(bundle.notes[0]?.image).toContain('data:image/png');
    expect(readVersionNotes('v0.9')).toHaveLength(1);
});
test('介绍更新只覆盖同版同端同页，批量导出包含未备注页面', () => {
    saveVersionNote({ ...record('v0.8', 'one'), kind: 'introduction', introduction: '旧介绍' });
    saveVersionNote({ ...record('v0.8', 'two'), kind: 'introduction', introduction: '新介绍' });
    const bundle = versionNoteBundle({ version: 'v0.8', pages: [{ platform: 'mobile', pageId: 'orders', title: '订单', path: '/mobile/#/orders' }, { platform: 'manage', pageId: 'refund', title: '退款', path: '/manage/refund' }] });
    expect(bundle.pages).toHaveLength(4); expect(bundle.pages.find((page) => page.pageId === 'orders')?.introduction).toBe('新介绍'); expect(bundle.notes).toHaveLength(1);
});
test('快捷键按当前版本呼出，纯文字可保存且关闭后恢复焦点', () => {
    const button = document.createElement('button'); document.body.append(button); button.focus();
    const remove = installVersionNotesShortcut(() => ({ version: 'v0.8', platform: 'mobile', pageId: 'orders' }));
    fireEvent.keyDown(window, { key: 'E', ctrlKey: true, shiftKey: true });
    expect(screen.getByRole('dialog', { name: '版本介绍与评审备注' })).toBeInTheDocument();
    fireEvent.input(screen.getByLabelText('评审备注'), { target: { value: '输入失败仍保留金额' } });
    fireEvent.click(screen.getByRole('button', { name: '保存本机备注' }));
    expect(readVersionNotes('v0.8')[0]?.remark).toBe('输入失败仍保留金额');
    fireEvent.click(screen.getByRole('button', { name: '关闭' })); expect(document.activeElement).toBe(button); remove(); button.remove();
});
test('存储损坏和配额不足不覆盖已有数据', () => {
    localStorage.setItem('prototype_version_notes_v1_v0.8', 'bad'); expect(() => saveVersionNote(record('v0.8', 'one'))).toThrow(); expect(localStorage.getItem('prototype_version_notes_v1_v0.8')).toBe('bad');
    localStorage.clear(); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); }); expect(() => saveVersionNote(record('v0.8', 'one'))).toThrow('quota');
});

test('图片上传保存并按版本批量导出 HTML，文字转义且图片内嵌', async () => {
    const blobs: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:notes'; }) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    openVersionNotebook({ version: 'v0.8', platform: 'mobile', pageId: 'orders' });
    fireEvent.input(screen.getByLabelText('评审备注'), { target: { value: '<script>不能执行</script>退款失败' } });
    fireEvent.change(screen.getByLabelText('评审图片'), { target: { files: [new File(['image'], 'test.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('图片已载入'));
    fireEvent.click(screen.getByRole('button', { name: '保存本机备注' }));
    expect(readVersionNotes('v0.8')[0]?.image).toMatch(/^data:image\/png;base64,/);
    exportVersionNotes({ version: 'v0.8' }, 'html');
    const html = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsText(blobs[0]!); });
    expect(html).toContain('&lt;script&gt;不能执行&lt;/script&gt;');
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('<script>不能执行</script>');
});
