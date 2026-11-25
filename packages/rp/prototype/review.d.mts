import type { Change } from './model.mjs';
export type ReviewContext = { version: string; baseline?: string | null | undefined; change?: Change | undefined; platform?: string | undefined; pageId?: string | undefined; page?: string | undefined; scenario?: string | undefined; pageUrl?: string | undefined; comparisonUrl?: string };
export function cleanContextUrl(value: string): string;
export function reviewLinks(context: ReviewContext): { create: string; history: string; thread: string | null; body: string };
