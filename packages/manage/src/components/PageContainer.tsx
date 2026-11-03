import type { ReactNode } from 'react';

interface PageContainerProps {
    title?: ReactNode;
    extra?: ReactNode;
    children: ReactNode;
}

/** 内容区卡片外壳：统一内边距与标题行 */
export function PageContainer({ title, extra, children }: PageContainerProps) {
    return (
        <div className="page-container">
            {(title || extra) && (
                <div className="page-container__header">
                    <div className="page-container__title">{title}</div>
                    {extra && <div>{extra}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
