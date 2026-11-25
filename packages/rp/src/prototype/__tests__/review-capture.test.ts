import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { openReviewCapture, wrapReviewText } from '../review-capture';

const pdf = vi.hoisted(() => ({ addImage: vi.fn(), addPage: vi.fn(), setProperties: vi.fn(), save: vi.fn() }));
const capture = vi.hoisted(() => vi.fn());
vi.mock('html2canvas-pro', () => ({ default: capture }));
vi.mock('jspdf', () => ({ jsPDF: class { addImage = pdf.addImage; addPage = pdf.addPage; setProperties = pdf.setProperties; save = pdf.save; } }));
const context = { version: 'v0.8', baseline: 'v0.2', platform: 'mobile', pageId: 'orders', scenario: 'failure' };
const drawing = { clearRect: vi.fn(), drawImage: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(), measureText: (value: string) => ({ width: value.length * 20 }) };
beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,c2hvdA==');
    vi.stubGlobal('Image', class { naturalWidth = 390; naturalHeight = 800; src = ''; decode() { return Promise.resolve(); } });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:manual-screenshot') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    capture.mockImplementation(() => { const shot = document.createElement('canvas'); shot.width = 390; shot.height = 800; return Promise.resolve(shot); });
});
afterEach(() => {
    const close = screen.queryByRole('button', { name: '关闭' });
    if (close) fireEvent.click(close);
    vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function screenshot() {
    fireEvent.click(screen.getByRole('button', { name: '截取当前页面' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保存本机记录' })).toBeEnabled());
}
test('框选编号与意见保存后可重开；其他版本记录不混入当前版本', async () => {
    openReviewCapture(context);
    await screenshot();
    fireEvent.click(screen.getByRole('button', { name: '标注整张截图' }));
    fireEvent.input(screen.getByLabelText('标注 1 的意见'), { target: { value: '退款失败应保留输入' } });
    fireEvent.input(screen.getByLabelText('整体评审意见'), { target: { value: '需要复核' } });
    fireEvent.click(screen.getByRole('button', { name: '保存本机记录' }));
    expect(screen.getByRole('status')).toHaveTextContent('尚未提交评审 Discussion');
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    openReviewCapture({ ...context, version: 'v0.7' });
    expect(screen.getByText('本浏览器尚无此版本的截图记录。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    openReviewCapture(context);
    const history = document.querySelector('details')!; history.open = true;
    fireEvent.click(screen.getByRole('button', { name: /orders/ }));
    await waitFor(() => expect(screen.getByLabelText('标注 1 的意见')).toHaveValue('退款失败应保留输入'));
    expect(screen.getByLabelText('整体评审意见')).toHaveValue('需要复核');
    fireEvent.click(screen.getByRole('button', { name: '导出标注 PDF' }));
    await waitFor(() => expect(pdf.save).toHaveBeenCalledWith(expect.stringMatching(/^v0.8-orders-.+-review.pdf$/)));
    expect(pdf.addPage).toHaveBeenCalled(); // 390 × 800 的长图分页，正文独立成页。
    expect(drawing.fillText.mock.calls.some((call) => String(call[0]).includes('退款失败应保留输入'))).toBe(true);
});
test('截图失败可重试；存储写入失败仍允许导出，未保存关闭可取消', async () => {
    capture.mockRejectedValueOnce(new Error('截图失败'));
    openReviewCapture(context);
    fireEvent.click(screen.getByRole('button', { name: '截取当前页面' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('截图失败'));
    await screenshot();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    fireEvent.click(screen.getByRole('button', { name: '保存本机记录' }));
    expect(screen.getByRole('status')).toHaveTextContent('保存失败');
    expect(screen.getByRole('button', { name: '导出标注 PDF' })).toBeEnabled();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});
test('中文、长地址与显式换行均按可用宽度拆行', () => {
    expect(wrapReviewText(drawing as unknown as CanvasRenderingContext2D, '中文意见\nabcdef', 60)).toEqual(['中文意', '见', 'abc', 'def']);
});
test('手动上传截图后可直接标注导出，不调用网页或系统截图', async () => {
    openReviewCapture(context);
    const input = screen.getByLabelText('上传截图');
    fireEvent.change(input, { target: { files: [new File(['bad'], 'test.svg', { type: 'image/svg+xml' })] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('请选择不超过 10 MB'));
    fireEvent.change(input, { target: { files: [new File(['image'], 'manual.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已载入手动截图'));
    fireEvent.click(screen.getByRole('button', { name: '标注整张截图' }));
    fireEvent.input(screen.getByLabelText('标注 1 的意见'), { target: { value: '手动截图的意见' } });
    fireEvent.click(screen.getByRole('button', { name: '导出标注 PDF' }));
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(capture).not.toHaveBeenCalled();
    expect(drawing.fillText.mock.calls.some((call) => String(call[0]).includes('手动上传'))).toBe(true);
});
