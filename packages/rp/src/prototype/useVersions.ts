import { useEffect, useState } from 'react';
import { readPrototype, sourceReleases, VERSION_EVENT, VERSION_STORAGE_KEY } from '@/mocks/prototype';

export function useVersions() {
    const [local, setLocal] = useState(readPrototype);
    useEffect(() => {
        const update = () => setLocal(readPrototype());
        const storage = (event: StorageEvent) => { if (!event.key || event.key === VERSION_STORAGE_KEY) update(); };
        window.addEventListener(VERSION_EVENT, update);
        window.addEventListener('storage', storage);
        return () => { window.removeEventListener(VERSION_EVENT, update); window.removeEventListener('storage', storage); };
    }, []);
    return { releases: sourceReleases, notes: local.notes };
}
