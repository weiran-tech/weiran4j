import { useQuery } from '@tanstack/react-query';
import { isSnapshot, type Snapshot } from './catalog';
export function useSnapshots() {
    return useQuery({ queryKey: ['prototype-snapshots'], queryFn: async () => {
        const lists = await Promise.all(['/releases/index.json', '/versions/index.json'].map(async (path) => {
            const response = await fetch(path);
            if (response.status === 404) return [] as Snapshot[];
            if (!response.ok) throw new Error('版本构建索引加载失败');
            const value: unknown = await response.json();
            if (!Array.isArray(value) || !value.every(isSnapshot)) throw new Error('版本构建索引格式不正确');
            return value;
        }));
        return [...new Map(lists.flat().map((item) => [item.base, item])).values()];
    }, retry: false });
}
