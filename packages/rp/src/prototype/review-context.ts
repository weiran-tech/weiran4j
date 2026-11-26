import type { Change } from '../../prototype/model.mjs';

/** 本机评审的页面上下文，与远程协作服务无关。 */
export type ReviewContext = { version: string; baseline?: string | null | undefined; change?: Change | undefined; platform?: string | undefined; pageId?: string | undefined; page?: string | undefined; scenario?: string | undefined; pageUrl?: string | undefined; comparisonUrl?: string };
