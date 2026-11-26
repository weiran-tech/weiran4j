import { canReview, type Platform, type ProductPage, type Release } from './model';
export interface ReviewNote { id: string; versionId: string; pageId: string; platform?: Platform; changeId?: string; author: string; text: string; image?: string; images?: string[]; pageTitle?: string; updatedAt?: string; date: string }
export interface LocalState { notes: Record<string, ReviewNote[]>; deletedIds?: Record<string, string[]> }
export type ReviewInput = Omit<ReviewNote, 'id' | 'versionId' | 'date' | 'updatedAt' | 'pageTitle'>;
const empty = (): LocalState => ({ notes: {} });

export const reviewImages = (note: Pick<ReviewNote, 'images' | 'image'>) => note.images ?? (note.image ? [note.image] : []);
export interface ReviewStoreOptions {
    storage: Storage;
    storageKey: string;
    releases: () => Release[];
    pagesForReview: (release: Release) => ProductPage[];
    onChange?: () => void;
    legacyNotes?: (release: Release) => ReviewNote[];
}
export function createReviewStore(options: ReviewStoreOptions) {
    const { storage, storageKey, releases: sourceReleases, pagesForReview } = options;
/** 兼容旧评审；旧 records 不再作为版本来源，未知版本的意见保留为可导出的存档。 */
function readSaved(): LocalState {
    try {
        const saved = JSON.parse(storage.getItem(storageKey) ?? 'null') as { notes?: Record<string, unknown>; deletedIds?: Record<string, string[]> } | null;
        if (!saved?.notes || typeof saved.notes !== 'object' || Array.isArray(saved.notes)) return empty();
        const notes: Record<string, ReviewNote[]> = {};
        for (const [version, entries] of Object.entries(saved.notes)) {
            if (!Array.isArray(entries) || !/^v\d+\.\d+(?:\.\d+)?$/.test(version)) continue;
            notes[version] = (entries as Partial<ReviewNote>[]).filter(note => note && ['id', 'pageId', 'author', 'text', 'date'].every(key => typeof note[key as keyof ReviewNote] === 'string') && (!note.image || /^data:image\/(png|jpeg|webp);base64,/.test(note.image))).map(note => ({
                id: note.id!, versionId: version, pageId: note.pageId!, author: note.author!, text: note.text!, date: note.date!,
                ...(note.image ? { image: note.image } : {}), ...(Array.isArray(note.images) ? { images: note.images.filter((image): image is string => typeof image === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(image)) } : {}), ...(typeof note.pageTitle === 'string' ? { pageTitle: note.pageTitle } : {}), ...(typeof note.updatedAt === 'string' ? { updatedAt: note.updatedAt } : {}), ...(note.changeId ? { changeId: note.changeId } : {}),
                ...(note.platform === 'manage' || note.platform === 'mobile' ? { platform: note.platform } : {}),
            }));
        }
        return { notes, deletedIds: saved.deletedIds ?? {} };
    } catch { return empty(); }
}


function addReview(version: string, note: ReviewInput) { return saveReview(version, note); }
function updateReview(version: string, id: string, note: ReviewInput) { return saveReview(version, note, id); }
function readPrototype(): LocalState {
    const state = readSaved();
    for (const release of sourceReleases()) {
        const saved = state.notes[release.id] ?? [];
        const ids = new Set(saved.map(note => note.id));
        const legacy = (options.legacyNotes?.(release) ?? []).filter(note => !ids.has(note.id) && !(state.deletedIds?.[release.id] ?? []).includes(note.id));
        if (saved.length || legacy.length) state.notes[release.id] = [...legacy, ...saved];
    }
    return state;
}
function ensureWritable() {
    const raw = storage.getItem(storageKey);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        if (!data || typeof data.notes !== 'object' || !data.notes || Array.isArray(data.notes)) throw new Error();
    } catch { throw new Error('本机评审存储损坏，原数据已保留，请先备份后重试'); }
}
function deleteReview(version: string, id: string) {
    const release = sourceReleases().find(item => item.id === version);
    if (!release) throw new Error('版本不存在');
    if (!canReview(release)) throw new Error('仅进行中版本允许删除评审');
    ensureWritable();
    const state = readPrototype();
    if (!state.notes[version]?.some(note => note.id === id)) throw new Error('评审记录不存在，请刷新后重试');
    storage.setItem(storageKey, JSON.stringify({ notes: { ...state.notes, [version]: state.notes[version].filter(note => note.id !== id) }, deletedIds: { ...state.deletedIds, [version]: [...(state.deletedIds?.[version] ?? []), id] } }));
    options.onChange?.();
}
function saveReview(version: string, note: ReviewInput, id?: string) {
    const release = sourceReleases().find(item => item.id === version);
    if (!release) throw new Error('版本不存在');
    if (!canReview(release)) throw new Error('仅进行中版本允许新增和编辑评审，请通过 AI 修改源码中的版本状态');
    if (typeof note.pageId !== 'string') throw new Error('评审页面编号必须为字符串，版本整体使用空字符串');
    if (!note.text.trim() || !note.author.trim()) throw new Error('请填写建议人和评审意见');
    if (note.author.length > 50 || note.text.length > 5000) throw new Error('建议人最多50字，评审意见最多5000字');
    const page = pagesForReview(release).find(page => page.id === note.pageId && (!note.platform || page.platform === note.platform));
    if (note.pageId && !page) throw new Error('关联页面不属于本版本');
    if (note.changeId && !release.changes.some(change => change.id === note.changeId && change.pageId === note.pageId && (change.platform ?? 'manage') === page?.platform)) throw new Error('变动项与本版本、页面不匹配');
    const images = reviewImages(note);
    if (images.length > 6 || images.some(image => typeof image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 1_400_000)) throw new Error('最多6张截图，仅支持每张 1MB 以内的 PNG、JPEG 或 WebP 图片');
    ensureWritable();
    const state = readPrototype();
    const previous = id ? state.notes[version]?.find(item => item.id === id) : undefined;
    if (id && !previous) throw new Error('评审记录不存在，请刷新后重试');
    const clean: ReviewNote = { id: previous?.id ?? crypto.randomUUID(), versionId: version, pageId: note.pageId, pageTitle: page?.title ?? '版本整体', author: note.author.trim(), text: note.text.trim(), date: previous?.date ?? new Date().toISOString(), ...(previous ? { updatedAt: new Date().toISOString() } : {}), ...(page ? { platform: page.platform } : {}), ...(note.changeId ? { changeId: note.changeId } : {}), images };
    const entries = state.notes[version] ?? [];
    const updated = previous ? entries.map(item => item.id === id ? clean : item) : [...entries, clean];
    storage.setItem(storageKey, JSON.stringify({ ...state, notes: { ...state.notes, [version]: updated } }));
    options.onChange?.();
    return clean;
}

return { readPrototype, addReview, updateReview, deleteReview };
}
export type ReviewStore = ReturnType<typeof createReviewStore>;
