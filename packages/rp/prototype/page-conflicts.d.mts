import type { Release, Change } from './model.mjs';
export function pageConflicts(release: Release, releases: Release[]): { version: string; status: string; baseline: string; platform: string; pageId: string; title: string; local: Change[]; remote: Change[] }[];
