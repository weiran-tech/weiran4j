import type { Catalog } from './model.mjs';
export function assembleManifest(index: { current: string; activeVersion?: string | null }, files: Record<string, unknown>): Catalog;
