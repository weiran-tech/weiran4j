import type { Editor } from '@tiptap/core';
import { useState } from 'react';
import { RichTextEditor as PackageRichTextEditor } from '@weiran-tech/manage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { RichTextEditor } from '../RichTextEditor';

function stubUploadRequest(automatic = false) {
    const requests: Array<{
        upload: { onprogress: ((event: ProgressEvent) => void) | null };
        onload: (() => void) | null;
        emitProgress: (percent: number) => void;
        finish: () => void;
    }> = [];
    class MockUploadRequest {
        upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onabort: (() => void) | null = null;
        status = 200;
        responseText = JSON.stringify({ code: 0, message: 'ok', data: { url: '/system-uploads/clip.mp4' } });
        withCredentials = false;
        open() { /* 测试只需模拟上传响应 */ }
        setRequestHeader() { /* 测试只需模拟上传响应 */ }
        getResponseHeader() { return null; }
        send() {
            requests.push(this);
            if (automatic) queueMicrotask(() => this.finish());
        }
        emitProgress(percent: number) {
            this.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 } as ProgressEvent);
        }
        finish() {
            this.emitProgress(100);
            this.onload?.();
        }
        abort() { this.onabort?.(); }
    }
    vi.stubGlobal('XMLHttpRequest', MockUploadRequest);
    return requests;
}

describe('RichTextEditor', () => {
    afterEach(() => vi.unstubAllGlobals());

    const settings = {
        imageFormats: ['png'], imageMaxSizeMb: 2,
        videoFormats: ['mp4'], videoMaxSizeMb: 5,
        fileFormats: ['pdf'], fileMaxSizeMb: 3,
    };

    it('普通文件上传展示进度并以安全文本插入链接', async () => {
        let finish!: (result: { url: string; name: string }) => void;
        const upload = vi.fn((_file: File, progress?: (percent: number) => void) => {
            progress?.(50);
            return new Promise<{ url: string; name: string }>((resolve) => { finish = resolve; });
        });
        const onChange = vi.fn();
        const onUploadingChange = vi.fn();
        const { container, unmount } = render(<PackageRichTextEditor value="<p>正文</p>" onChange={onChange}
            settings={settings} upload={upload} onUploadingChange={onUploadingChange} />);
        await screen.findByRole('button', { name: '上传并插入文件' });
        const input = container.querySelector('input[accept=".pdf"]')!;
        fireEvent.change(input, { target: { files: [new File(['pdf'], '附件.pdf')] } });
        expect(await screen.findByRole('status')).toHaveTextContent('50%');
        expect(onUploadingChange).toHaveBeenCalledWith(true);
        await act(() => Promise.resolve(finish({ url: '/attachment.pdf', name: '<img src=x>.pdf' })));
        const link = container.querySelector('.ProseMirror a');
        expect(link).toHaveAttribute('href', '/attachment.pdf');
        expect(link).toHaveTextContent('<img src=x>.pdf');
        expect(container.querySelector('.ProseMirror img')).toBeNull();
        expect(screen.queryByRole('status')).toBeNull();
        expect(onUploadingChange).toHaveBeenLastCalledWith(false);
        const html = onChange.mock.lastCall![0] as string;
        unmount();
        const reloaded = render(<PackageRichTextEditor value={html} onChange={onChange} settings={settings} upload={upload} />);
        await waitFor(() => expect(reloaded.container.querySelector('.ProseMirror a')).toHaveAttribute('href', '/attachment.pdf'));
    });

    it('拒绝不合法文件，上传失败后恢复入口并允许重试', async () => {
        const upload = vi.fn().mockRejectedValueOnce(new Error('失败')).mockResolvedValue('/ok.pdf');
        const { container } = render(<PackageRichTextEditor value="" onChange={() => undefined} settings={settings} upload={upload} />);
        const button = await screen.findByRole('button', { name: '上传并插入文件' });
        const input = container.querySelector('input[accept=".pdf"]')!;
        fireEvent.change(input, { target: { files: [new File(['x'], 'bad.exe'), new File([], 'empty.pdf')] } });
        expect(upload).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { files: [new File(['pdf'], 'ok.pdf')] } });
        await waitFor(() => expect(button).toBeEnabled());
        expect(container.querySelector('.ProseMirror a')).toBeNull();
        fireEvent.change(input, { target: { files: [new File(['pdf'], 'ok.pdf')] } });
        await waitFor(() => expect(container.querySelector('.ProseMirror a')).toHaveAttribute('href', '/ok.pdf'));
    });

    it('新增链接、拒绝危险协议并取消编辑', async () => {
        const onChange = vi.fn();
        const { container } = render(<PackageRichTextEditor value="<p>正文</p>" onChange={onChange} settings={settings} upload={vi.fn()} />);
        fireEvent.click(await screen.findByRole('button', { name: '设置链接' }));
        fireEvent.change(screen.getByRole('textbox', { name: '链接地址' }), { target: { value: 'javascript:alert(1)' } });
        fireEvent.click(screen.getByRole('button', { name: '保存链接' }));
        expect(await screen.findByText('请输入有效的 HTTP(S)、邮箱、电话或站内链接')).toBeInTheDocument();
        expect(container.querySelector('.ProseMirror a')).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: '链接地址' }), { target: { value: 'https://example.com/file' } });
        fireEvent.keyPress(screen.getByRole('textbox', { name: '链接地址' }), { key: 'Enter', charCode: 13 });
        await waitFor(() => expect(container.querySelector('.ProseMirror a')).toHaveAttribute('href', 'https://example.com/file'));
        const previous = onChange.mock.lastCall![0];
        fireEvent.click(screen.getByRole('button', { name: '设置链接' }));
        fireEvent.change(screen.getByRole('textbox', { name: '链接地址' }), { target: { value: '/other' } });
        fireEvent.click(screen.getByRole('button', { name: '取消链接编辑' }));
        expect(onChange.mock.lastCall![0]).toBe(previous);
    });

    it('选中文字设置链接，在链接内修改和移除时保留原文', async () => {
        function Fixture() {
            const [html, setHtml] = useState('<p>正文与尾部</p>');
            return <PackageRichTextEditor value={html} onChange={setHtml} settings={settings} upload={vi.fn()} />;
        }
        const { container } = render(<Fixture />);
        await screen.findByRole('button', { name: '设置链接' });
        const content = container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor };
        act(() => { content.editor.commands.setTextSelection({ from: 1, to: 3 }); });
        fireEvent.click(screen.getByRole('button', { name: '设置链接' }));
        fireEvent.change(screen.getByRole('textbox', { name: '链接地址' }), { target: { value: '/first' } });
        fireEvent.keyPress(screen.getByRole('textbox', { name: '链接地址' }), { key: 'Enter', charCode: 13 });
        await waitFor(() => expect(content.querySelector('a')).toHaveAttribute('href', '/first'));
        expect(content.querySelector('a')).toHaveTextContent('正文');
        expect(content).toHaveTextContent('正文与尾部');
        act(() => { content.editor.commands.setTextSelection(2); });
        expect(screen.getByRole('button', { name: '移除链接' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: '设置链接' }));
        expect(screen.getByRole('textbox', { name: '链接地址' })).toHaveValue('/first');
        fireEvent.change(screen.getByRole('textbox', { name: '链接地址' }), { target: { value: 'https://example.com/updated' } });
        fireEvent.keyPress(screen.getByRole('textbox', { name: '链接地址' }), { key: 'Enter', charCode: 13 });
        await waitFor(() => expect(content.querySelector('a')).toHaveAttribute('href', 'https://example.com/updated'));
        expect(content.querySelector('a')).toHaveAttribute('rel', 'noopener noreferrer');
        fireEvent.click(screen.getByRole('button', { name: '移除链接' }));
        expect(content.querySelector('a')).toBeNull();
        expect(content).toHaveTextContent('正文与尾部');
    });

    it('上传期间正文修改仍在原位置插入，部分失败保留成功文件', async () => {
        let finish!: (url: string) => void;
        const upload = vi.fn().mockImplementationOnce(() => new Promise<string>((resolve) => { finish = resolve; }))
            .mockRejectedValueOnce(new Error('失败'));
        function Fixture() {
            const [html, setHtml] = useState('<p>正文</p>');
            return <PackageRichTextEditor value={html} onChange={setHtml} settings={settings} upload={upload} />;
        }
        const { container } = render(<Fixture />);
        await screen.findByRole('button', { name: '上传并插入文件' });
        const content = container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor };
        act(() => { content.editor.commands.setTextSelection(3); });
        fireEvent.change(container.querySelector('input[accept=".pdf"]')!, {
            target: { files: [new File(['1'], '一.pdf'), new File(['2'], '二.pdf')] },
        });
        act(() => { content.editor.commands.insertContentAt(1, '前缀'); });
        await act(() => Promise.resolve(finish('/first.pdf')));
        await waitFor(() => expect(content.querySelectorAll('a')).toHaveLength(1));
        expect(content).toHaveTextContent('前缀正文一.pdf');
        expect(content.querySelector('a')).toHaveAttribute('href', '/first.pdf');
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('上传中切换只读或卸载不会插入已完成文件', async () => {
        let finish!: (url: string) => void;
        const upload = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
        const onChange = vi.fn();
        const { container, rerender, unmount } = render(<PackageRichTextEditor value="" onChange={onChange} settings={settings} upload={upload} />);
        await screen.findByRole('button', { name: '上传并插入文件' });
        fireEvent.change(container.querySelector('input[accept=".pdf"]')!, { target: { files: [new File(['x'], 'a.pdf')] } });
        rerender(<PackageRichTextEditor value="" onChange={onChange} settings={settings} upload={upload} disabled />);
        await act(() => Promise.resolve(finish('/a.pdf')));
        expect(container.querySelector('.ProseMirror a')).toBeNull();
        rerender(<PackageRichTextEditor value="" onChange={onChange} settings={settings} upload={upload} />);
        fireEvent.change(container.querySelector('input[accept=".pdf"]')!, { target: { files: [new File(['x'], 'b.pdf')] } });
        unmount();
        onChange.mockClear();
        await act(() => Promise.resolve(finish('/b.pdf')));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('只读或配置未加载时禁止文件上传', async () => {
        const { rerender } = render(<PackageRichTextEditor value="" onChange={() => undefined} upload={vi.fn()} />);
        expect(await screen.findByRole('button', { name: '上传并插入文件' })).toBeDisabled();
        rerender(<PackageRichTextEditor value="" onChange={() => undefined} upload={vi.fn()} settings={settings} disabled />);
        expect(screen.getByRole('button', { name: '上传并插入文件' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '设置链接' })).toBeDisabled();
    });

    it('选中图片后设置百分比宽度与位置，保存并重新加载布局', async () => {
        const onChange = vi.fn();
        const upload = vi.fn(() => Promise.resolve('/image.png'));
        const { container, unmount } = render(<PackageRichTextEditor
            value={'<p>正文</p><img src="/image.png" width="400">'} onChange={onChange} settings={settings} upload={upload} />);
        const image = await waitFor(() => {
            const node = container.querySelector('.ProseMirror img');
            expect(node).not.toBeNull();
            return node!;
        });
        expect(image).toHaveAttribute('data-media-width', '400px');
        fireEvent.click(image);
        expect(await screen.findByRole('group', { name: '图片布局' })).toBeInTheDocument();
        expect(container.querySelector('.rich-text-editor__toolbar .rich-text-editor__media-tools')).toBeNull();
        fireEvent.change(screen.getByRole('combobox', { name: '宽度单位' }), { target: { value: '%' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: '媒体宽度' }), { target: { value: '50' } });
        fireEvent.blur(screen.getByRole('spinbutton', { name: '媒体宽度' }));
        fireEvent.click(screen.getByRole('button', { name: '居中' }));
        const html = onChange.mock.lastCall?.[0] as string;
        expect(html).toContain('data-media-width="50%"');
        expect(html).toContain('data-media-align="center"');
        expect(html).toContain('width: 50%');
        unmount();
        const reloaded = render(<PackageRichTextEditor value={html} onChange={onChange} settings={settings} upload={upload} />);
        expect(reloaded.container.querySelector('.ProseMirror img')).toHaveAttribute('data-media-width', '50%');
    });

    it('选中视频后设置像素宽度与右侧位置', async () => {
        const onChange = vi.fn();
        const { container } = render(<PackageRichTextEditor
            value={'<p>正文</p><video src="/clip.mp4" controls></video>'}
            onChange={onChange} settings={settings} upload={vi.fn(() => Promise.resolve('/clip.mp4'))} />);
        const video = await waitFor(() => {
            const node = container.querySelector('.ProseMirror video');
            expect(node).not.toBeNull();
            return node!;
        });
        fireEvent.click(video);
        expect(await screen.findByRole('group', { name: '视频布局' })).toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox', { name: '宽度单位' }), { target: { value: 'px' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: '媒体宽度' }), { target: { value: '320' } });
        fireEvent.blur(screen.getByRole('spinbutton', { name: '媒体宽度' }));
        fireEvent.click(screen.getByRole('button', { name: '右对齐' }));
        const html = onChange.mock.lastCall?.[0] as string;
        expect(html).toContain('data-media-width="320px"');
        expect(html).toContain('data-media-align="right"');
        expect(html).toContain('width: 320px');
    });

    it('上传视频后插入可播放的 video HTML', async () => {
        mockFetch({
            'GET /api-backend/system/media/getDirectUploadAuthorization': null,
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
        const requests = stubUploadRequest();
        const onChange = vi.fn();
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={onChange} />);
        const videoButton = await screen.findByRole('button', { name: '上传并插入视频' });
        await waitFor(() => expect(videoButton).toBeEnabled());
        fireEvent.click(videoButton);
        const input = container.querySelector('input[type="file"][accept=".mp4,.webm,.mov"]');
        expect(input).not.toBeNull();
        fireEvent.change(input!, { target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] } });
        expect(await screen.findByRole('status')).toHaveTextContent('视频上传中（1 个）');
        expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('视频上传中'));
        await waitFor(() => expect(requests).toHaveLength(1));
        act(() => requests[0]!.emitProgress(50));
        expect(screen.getByRole('status')).toHaveTextContent('50%');
        act(() => requests[0]!.finish());
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.stringContaining('<video')));
        expect(screen.queryByRole('status')).toBeNull();
        expect(onChange.mock.lastCall?.[0]).toContain('src="/system-uploads/clip.mp4"');
        expect(onChange.mock.lastCall?.[0]).toContain('controls');
        expect(requests).toHaveLength(1);
    });

    it('图片和视频分别禁用自己的按钮，表单等待全部上传完成', async () => {
        mockFetch({
            'GET /api-backend/system/media/getDirectUploadAuthorization': null,
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
        stubUploadRequest(true);
        let resolveImage!: (url: string) => void;
        const onUploadImage = vi.fn(() => new Promise<string>((resolve) => { resolveImage = resolve; }));
        const onUploadingChange = vi.fn();
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={() => undefined} onUploadImage={onUploadImage} onUploadingChange={onUploadingChange} />);
        const imageButton = await screen.findByRole('button', { name: '上传并插入图片' });
        const videoButton = screen.getByRole('button', { name: '上传并插入视频' });
        const imageInput = await waitFor(() => {
            const input = container.querySelector('input[type="file"][accept=".png"]');
            expect(input).not.toBeNull();
            return input;
        });
        const videoInput = container.querySelector('input[type="file"][accept=".mp4,.webm,.mov"]');
        expect(imageInput).not.toBeNull();
        expect(videoInput).not.toBeNull();

        fireEvent.change(imageInput!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
        await waitFor(() => expect(imageButton).toBeDisabled());
        expect(screen.getByRole('status')).toHaveTextContent('图片上传中（1 张）');
        expect(videoButton).toBeEnabled();
        expect(onUploadingChange).toHaveBeenCalledWith(true);

        fireEvent.change(videoInput!, { target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] } });
        await waitFor(() => expect(videoButton).toBeEnabled());
        expect(imageButton).toBeDisabled();
        expect(onUploadingChange).toHaveBeenCalledTimes(1);

        act(() => { resolveImage('/system-uploads/cover.png'); });
        await waitFor(() => expect(imageButton).toBeEnabled());
        expect(screen.queryByRole('status')).toBeNull();
        expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    });

    it('图片上传失败后清除占位提示', async () => {
        mockFetch({
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
            },
        });
        let rejectImage!: (error: Error) => void;
        const onUploadImage = vi.fn(() => new Promise<string>((_resolve, reject) => { rejectImage = reject; }));
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={() => undefined} onUploadImage={onUploadImage} />);
        const input = await waitFor(() => {
            const element = container.querySelector('input[type="file"][accept=".png"]');
            expect(element).not.toBeNull();
            return element;
        });
        fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
        expect(await screen.findByRole('status')).toHaveTextContent('图片上传中（1 张）');
        act(() => rejectImage(new Error('上传失败')));
        await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
        expect(container.querySelector('.ProseMirror img')).toBeNull();
    });
});
