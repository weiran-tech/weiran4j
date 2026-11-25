export function parseRefund(value: string, remainingCents: number): { error: string; cents?: never } | { cents: number; error?: never };
export function money(cents: number): string;
