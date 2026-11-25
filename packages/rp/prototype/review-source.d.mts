export type ReviewReference = { kind: 'discussion' | 'issue'; number: number; label: string; url: string };
export function reviewReference(version: string): ReviewReference | null;
