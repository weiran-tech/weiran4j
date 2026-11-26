import { createReviewStore, reviewImages, type ReviewNote } from '@weiran-tech/prototype/core';
import { readVersionNotes } from '@/prototype/version-notes';
import { pagesForReview, sourceReleases } from '@/prototype/management-catalog';
export { currentVersion, sourceReleases } from '@/prototype/management-catalog';
export { reviewImages };
export type { ReviewNote };
export const VERSION_STORAGE_KEY = 'weiran_prototype_reviews_v1';
export const VERSION_EVENT = 'weiran-prototype-reviews';
export const reviewStore = createReviewStore({
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key), clear: () => localStorage.clear(), key: index => localStorage.key(index), get length() { return localStorage.length; } },
    storageKey: VERSION_STORAGE_KEY,
    releases: () => sourceReleases,
    pagesForReview,
    onChange: () => window.dispatchEvent(new Event(VERSION_EVENT)),
    legacyNotes: release => {
        const pages = pagesForReview(release);
        return readVersionNotes(release.id).map(note => {
            const page = pages.find(page => page.platform === note.platform && (page.id === note.pageId || page.path === note.page));
            return { id: 'legacy:' + note.id, versionId: release.id, pageId: page?.id ?? '', pageTitle: page?.title ?? note.title, ...(page ? { platform: page.platform } : {}), author: '本机备注', text: [note.introduction, note.remark].filter(Boolean).join('\n'), date: note.createdAt, ...(note.image ? { image: note.image } : {}) };
        });
    },
});
export const { readPrototype, addReview, updateReview, deleteReview } = reviewStore;
