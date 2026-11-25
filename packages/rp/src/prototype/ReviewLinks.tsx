import { Button, Toast } from '@douyinfe/semi-ui';
import { reviewLinks, type ReviewContext } from '../../prototype/review.mjs';
import { reviewReference } from '../../prototype/review-source.mjs';

export function ReviewLinks({ context, captureTarget }: { context: ReviewContext; captureTarget?: () => HTMLElement | null }) {
    const links = reviewLinks(context);
    const legacy = reviewReference(context.version);
    return <span className="proto-actions">{captureTarget && <Button size="small" onClick={async () => { try { const { openReviewCapture } = await import('./review-capture'); openReviewCapture(context, captureTarget); } catch { Toast.error('截图工具加载失败，请重试'); } }}>截图标注</Button>}<a href={links.thread || links.create} target="_blank" rel="noreferrer">{links.thread ? '参与版本评审 Discussion' : '发起评审 Discussion'} ↗</a><Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(links.body); Toast.success('已复制评审上下文，请粘贴到版本 Discussion 的评论中'); } catch { Toast.warning('复制失败，请从说明中选取上下文'); } }}>复制评审上下文</Button><a href={links.history} target="_blank" rel="noreferrer">查找评审记录 ↗</a>{legacy?.kind === 'issue' && <a href={legacy.url} target="_blank" rel="noreferrer">历史 Issue #{legacy.number} ↗</a>}</span>;
}
