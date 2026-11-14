import { Descriptions, Typography } from '@douyinfe/semi-ui';
import type { OperationLogView } from '@/types/api';
import { QueryReadiness, type ReadableQuery } from './QueryReadiness';
import { StatusTag } from './StatusTag';

/** 请求体是 JSON 就格式化，否则原样展示 */
export function prettyBody(body: string | null | undefined): string {
    if (!body) return '（无）';
    try {
        return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
        return body;
    }
}

/** 只呈现查询状态与详情，供业务页和本地文档演示复用。 */
export function OperationLogDetails({ query, onRetry }: { query: ReadableQuery & { data: OperationLogView | undefined }; onRetry: () => void }) {
    const { data } = query;
    return <>
        <QueryReadiness query={query} label="操作详情" onRetry={onRetry} />
        {data && (
                <>
                    <Descriptions
                        align="left"
                        data={[
                            { key: '操作人', value: data.username || '—' },
                            { key: '模块', value: data.module },
                            { key: '描述', value: data.description },
                            { key: '请求', value: `${data.method} ${data.path}` },
                            { key: '结果', value: <StatusTag value={data.success} /> },
                            { key: '响应码', value: String(data.responseCode) },
                            { key: '耗时', value: `${data.durationMs} ms` },
                            { key: 'IP', value: data.ip || '—' },
                            { key: 'User-Agent', value: data.userAgent || '—' },
                            { key: '时间', value: data.createdAt },
                            ...(data.errorMessage ? [{ key: '错误信息', value: data.errorMessage }] : []),
                        ]}
                    />
                    <Typography.Title heading={6} style={{ margin: '16px 0 8px' }}>
                        请求体
                    </Typography.Title>
                    <pre className="code-block">{prettyBody(data.requestBody)}</pre>
                </>
        )}
    </>;
}
