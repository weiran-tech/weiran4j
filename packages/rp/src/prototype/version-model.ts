export type Platform = 'manage' | 'mobile';
export const platformLabels = { manage: '管理端', mobile: '手机端' };
export interface ProductPage { id: string; title: string; path: string; module: string; platform: 'manage' | 'mobile'; inherited?: boolean }
export interface Change {
    id: string; type: 'add' | 'modify' | 'delete'; title: string; pageId: string; platform?: 'manage' | 'mobile';
    pageTitle: string; page: string; module: string; before: string; after: string;
    rules: string[]; acceptance: string[]; files?: string[];
}
export interface Release {
    id: string; title: string; status: 'in_progress' | 'completed'; baseline: string | null;
    date: string; version?: string; goal: string; changes: Change[];
    platformNotes?: Partial<Record<Platform, { introduction: string; remark: string }>>;
    snapshot?: string; pageSnapshots?: Record<string, string>; editBase?: string; implementationRef?: string;
}
export const statusLabels = { in_progress: '进行中', completed: '已完结' };
export const canReview = (release?: Release) => release?.status === 'in_progress';
export interface CatalogPage extends ProductPage { files: string[]; retired?: boolean }
