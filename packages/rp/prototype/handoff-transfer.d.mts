import type { Handoff } from './handoff.mjs';
export type HandoffTransfer = { kind: string; schemaVersion: number; version: string; baseUpdatedAt: string | null; base: Handoff | null; draft: Handoff };
export type Conflict = { path: string; local: unknown; incoming: unknown };
export function mergeHandoff(base: Handoff | null, local: Handoff, incoming: Handoff, choices?: Record<string, string>): { value: Handoff; conflicts: Conflict[] };
export function handoffTransfer(draft: Handoff, base?: Handoff | null, updatedAt?: string | null): HandoffTransfer;
