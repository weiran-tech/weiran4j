import { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';

export interface PageTabsActions {
    /** Close this page's tab, optionally refresh the destination, then navigate there. */
    closeCurrentAndGo: (path: string, refresh?: boolean) => void;
}

export const PageTabsContext = createContext<{ closeAndGo: (key: string, path: string, refresh?: boolean) => void } | null>(null);

export function usePageTabs(): PageTabsActions {
    const actions = useContext(PageTabsContext);
    const { pathname } = useLocation();
    if (!actions) throw new Error('usePageTabs 必须在后台布局内使用');
    return { closeCurrentAndGo: (path, refresh) => actions.closeAndGo(pathname, path, refresh) };
}
