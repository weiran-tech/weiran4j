import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { VideoPreview } from '../../../../component-manage/src/VideoPreview';

it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'])('视频预览拒绝可执行协议 %s', url => {
    render(<VideoPreview url={url} title="视频" onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('视频地址无效');
    expect(document.querySelector('video')).toBeNull();
});
it('有效 HTTPS 视频使用经过校验的地址', () => {
    render(<VideoPreview url="https://example.com/video.mp4" title="视频" onClose={() => {}} />);
    expect(document.querySelector('video')).toHaveAttribute('src', 'https://example.com/video.mp4');
});
