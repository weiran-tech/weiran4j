import type { ReviewNote } from './reviews';


export interface ReviewAuthors { names: string[]; lastUsed: string }
const clean = (value: unknown): string => typeof value === 'string' && value.trim().length <= 50 ? value.trim() : '';
export function createReviewAuthors(storage: Storage, storageKey: string, readNotes: () => Record<string, ReviewNote[]>) {
function readReviewAuthors(): ReviewAuthors {
    let saved: { names?: unknown; lastUsed?: unknown } = {};
    try { saved = JSON.parse(storage.getItem(storageKey) ?? '{}') as typeof saved ?? {}; } catch { /* 使用已有评审建议人 */ }
    const previous = Object.values(readNotes()).flat().sort((a, b) => a.date.localeCompare(b.date)).map(note => clean(note.author)).filter(Boolean);
    const names = [...new Set([...previous, ...(Array.isArray(saved.names) ? saved.names.map(clean).filter(Boolean) : [])])];
    const lastUsed = clean(saved.lastUsed) || names.at(-1) || '';
    if (lastUsed && !names.includes(lastUsed)) names.push(lastUsed);
    return { names, lastUsed };
}
function rememberReviewAuthor(value: string): ReviewAuthors {
    const name = clean(value);
    if (!name) throw new Error('建议人不能为空且最多50字');
    const previous = readReviewAuthors();
    const next = { names: [...previous.names.filter(item => item !== name), name], lastUsed: name };
    storage.setItem(storageKey, JSON.stringify(next));
    return next;
}

return { readReviewAuthors, rememberReviewAuthor };
}
export type ReviewAuthorStore = ReturnType<typeof createReviewAuthors>;
