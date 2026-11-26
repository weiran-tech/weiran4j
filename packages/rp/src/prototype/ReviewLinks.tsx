import { Button } from '@douyinfe/semi-ui';
import type { ReviewContext } from '../../prototype/review.mjs';
import { notebookContext } from './notebook-context';
import { openVersionNotebook } from './version-notes';
import { PortalLink } from './PortalRouter';
import { sitePath } from './catalog';

export function ReviewLinks({ context }: { context: ReviewContext; captureTarget?: () => HTMLElement | null }) {
    return <span className="proto-actions"><Button size="small" onClick={() => { const notebook = notebookContext(context.version, context.page, context.platform); if (notebook) openVersionNotebook(notebook); }}>本机评审备注</Button><PortalLink href={sitePath('/rp/versions?tab=review', context.version)}>查看版本评审与导出 →</PortalLink></span>;
}
