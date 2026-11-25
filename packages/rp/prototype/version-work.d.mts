import type { Release } from './model.mjs';
import { pageConflicts } from './page-conflicts.mjs';
export type Resolution = { fingerprint: string; decision: string; evidence: string; resolvedAt?: string };
export function canDerive(release?: Release): boolean;
export function conflictFingerprint(release: Release, conflict: ReturnType<typeof pageConflicts>[number]): string;
export function unresolvedConflicts(release: Release, releases: Release[], resolutions?: Resolution[]): ReturnType<typeof pageConflicts>;
export function workErrors(release: Release | undefined, releases: Release[], resolutions?: Resolution[]): string[];
