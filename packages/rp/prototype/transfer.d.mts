import type { Catalog, Release } from './model.mjs';
export function equal(a: unknown, b: unknown): boolean;
export function releaseTransfer(release: Release, base: Release | null | undefined): { schemaVersion: number; kind: string; base: Release | null; release: Release };
export function mergeTransfer(value: unknown, current: Catalog, choices?: Record<string, string>): { catalog: Catalog; conflicts: { path: string; local: unknown; incoming: unknown }[] };
