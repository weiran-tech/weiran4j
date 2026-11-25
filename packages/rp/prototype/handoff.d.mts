import type { Release, Snapshot } from './model.mjs';
export type Acceptance = { text: string; result: string; evidence: string };
export type Delivery = { id: string; owner: string; task: string; pr: string; noCodeReason: string; environment: string; build: string; state: string; reason: string; followUp: string; acceptedBy: string; acceptedAt: string; acceptedBuild: string; acceptance: Acceptance[] };
export type Publication = { url: string; environment: string; build: string; publishedBy: string; publishedAt: string; rollback: string; scope: string[]; noReleaseReason: string; verifiedBy: string; verifiedAt: string };
export type Handoff = { schemaVersion: number; version: string; phase: string; productOwner: string; technicalOwner: string; candidateId: string; candidateCommit: string; candidateFingerprint: string; candidateUrl: string; testData: string; publication: Publication; changes: Delivery[] };
export type Confirmation = { by: string; at: string; build: string; url?: string; command?: string };
export type Confirmations = { acceptances: Record<string, Confirmation>; publication: Confirmation | null };
export const phases: Record<string, string>; export const taskStates: Record<string, string>;
export function blankHandoff(release: Release): Handoff;
export function normalizeHandoff(value: unknown, release: Release): Handoff;
export function updateDelivery(item: Delivery, patch: Partial<Delivery>): Delivery;
export function handoffErrors(value: Handoff, release: Release): string[];
export function handoffMarkdown(value: Handoff, release: Release): string;
export function parseHandoff(body: string): Handoff;
export function approvalCommand(role: string, candidate: Snapshot & { fingerprint: string }): string;
export function acceptanceCommand(version: string, item: Delivery): Promise<string>;
export function deliveryCommand(value: Handoff): Promise<string>;

export function handoffIssueUrl(repository: string, release: Release, draft?: Handoff): string;
export const workflowStages: Record<string, string>;
export function workflowStage(value: Handoff, release: Release): string;
export function acceptanceComplete(value: Handoff): boolean;
export function publicationStarted(pub: Publication): boolean;
export function publicationStatus(value: Handoff): string;
export function engineeringSummary(value: Handoff, release: Release): string;
export function participantErrors(value: Handoff, policy: { product: string[]; technical: string[] }): string[];

export function publicationErrors(value: Handoff): string[];
