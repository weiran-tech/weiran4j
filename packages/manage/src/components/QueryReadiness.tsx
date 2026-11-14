import { ListFeedback } from './ListFeedback';

/** 只描述读取状态，业务页面与本地文档演示共用，不发起请求。 */
export interface ReadableQuery {
    data: unknown;
    isSuccess: boolean;
    isError: boolean;
    isFetching: boolean;
}

export function queriesReady(...queries: ReadableQuery[]): boolean {
    return queries.every((query) => query.isSuccess && !query.isError && !query.isFetching && query.data !== undefined && query.data !== null);
}

export function QueryReadiness({ query, label, onRetry }: { query: ReadableQuery; label: string; onRetry: () => void }) {
    if (query.isError) return <ListFeedback label={`${label}加载失败`} hasData={query.data !== undefined && query.data !== null} retrying={query.isFetching} onRetry={onRetry} />;
    if (query.isFetching) return <p role="status">正在读取{label}…</p>;
    return null;
}
