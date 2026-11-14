import { Spin } from '@douyinfe/semi-ui';
import { createElement, Suspense, useState } from 'react';
import { lazyPageFromLoader, type PageModuleLoader } from '../utils/page-loader';
import { PageErrorBoundary } from './PageErrorBoundary';

interface Props {
    loader: PageModuleLoader;
    onHome: () => void;
    onReload?: () => void;
}

/** 实例内保持 lazy 引用稳定；主动重试时新建 lazy，避免复用被缓存的拒绝结果。 */
export function RecoverablePage({ loader, onHome, onReload }: Props) {
    const [page, setPage] = useState(() => lazyPageFromLoader(loader));
    return (
        <PageErrorBoundary onHome={onHome} {...(onReload ? { onReload } : {})} onRetry={() => setPage(() => lazyPageFromLoader(loader, true))}>
            <Suspense fallback={<div className="page-loading" role="status" aria-label="页面加载中"><Spin size="large" /></div>}>
                {createElement(page)}
            </Suspense>
        </PageErrorBoundary>
    );
}
