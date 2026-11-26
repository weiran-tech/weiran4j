import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RpPageIdentity, RpPageReview, RpQuickSearch } from '@weiran-tech/prototype';
import { useIsLocked } from '@/hooks/useLockScreen';
import { currentVersion, pagesForReview, sourceReleases } from './management-catalog';
import { sitePath } from './catalog';
import { useVersions } from './useVersions';
import { reviewStore } from '@/mocks/prototype';
import { authorsStore } from './RpReviewForm';

/** 只注册本项目页面和路由；包内不携带业务菜单。 */
export function PrototypeTools() {
    const locked = useIsLocked();
    const location = useLocation();
    const navigate = useNavigate();
    const { notes } = useVersions();
    const release = sourceReleases.find(item => item.id === currentVersion);
    const pages = useMemo(() => release ? pagesForReview(release) : [], [release]);
    const searchPages = useMemo(() => pages.map(page => ({ ...page, path: sitePath(page.path, currentVersion), keywords: page.module })), [pages]);
    const page = pages.find(item => item.platform === 'manage' && item.path.split(/[?#]/)[0] === location.pathname);
    return <><RpQuickSearch pages={searchPages} locked={locked} onNavigate={path => void navigate(path)} />{release && page && !locked && <>
        <div style={{ position: 'fixed', right: 100, bottom: 20, zIndex: 100 }}><RpPageIdentity release={release} page={page} path={location.pathname + location.search} platform="manage" /></div>
        <RpPageReview release={release} page={{ ...page, files: [] }} pages={pages} notes={notes[release.id] ?? []} actions={reviewStore} authorsStore={authorsStore} locked={locked} reviewPath={sitePath('/rp/versions?tab=review', release.id)} />
    </>}</>;
}
