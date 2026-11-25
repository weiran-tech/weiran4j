import { createSearchParams, useLocation, useSearchParams } from 'react-router-dom';
import type { URLSearchParamsInit } from 'react-router-dom';
import { routeVersion } from './runtime';
import { sitePath } from './catalog';
import { navigatePortal } from './PortalRouter';

/** 为旧表单适配版本上下文；地址栏中的版本只保存在路径内。 */
export function useVersionParams() {
    const location = useLocation();
    const [raw, setRaw] = useSearchParams();
    const params = new URLSearchParams(raw);
    if (routeVersion) params.set('version', routeVersion);
    function setParams(input: URLSearchParamsInit) {
        const next = createSearchParams(input);
        const version = next.get('version') || routeVersion;
        if (routeVersion) {
            next.delete('version');
            if (version && version !== routeVersion) {
                if (!next.has('scope') && raw.has('scope')) next.set('scope', raw.get('scope')!);
                const target = sitePath(`${location.pathname}?${next}${location.hash}`, version);
                if (!navigatePortal(target)) window.location.assign(target);
                return;
            }
        }
        setRaw(next);
    }
    return [params, setParams] as const;
}
