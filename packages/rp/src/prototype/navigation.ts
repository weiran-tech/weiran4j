import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { globalPath } from '../../prototype/routes.mjs';
import { runtimeBase } from './runtime';
import { navigatePortal } from './PortalRouter';

/** 从版本应用返回全局入口时离开 BrowserRouter basename。 */
export function useWorkspaceNavigate() {
    const navigate = useNavigate();
    return useCallback((to: To | number, options?: NavigateOptions) => {
        if (typeof to === 'number') return navigate(to);
        const path = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
        const global = path.startsWith('/') ? globalPath(path) : null;
        if (global !== null && runtimeBase !== '/' && !runtimeBase.startsWith('/releases/')) {
            if (navigatePortal(global, options?.replace)) return;
            if (options?.replace) window.location.replace(global);
            else window.location.assign(global);
            return;
        }
        return navigate(to, options);
    }, [navigate]);
}
