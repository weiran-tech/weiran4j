import { Banner, Button, Empty } from '@douyinfe/semi-ui';

interface ListFeedbackProps {
    hasData: boolean;
    retrying: boolean;
    onRetry: () => void;
}

/** 查询失败后的持久提示；放在表格上方，缓存数据继续显示。 */
export function ListFeedback({ hasData, retrying, onRetry }: ListFeedbackProps) {
    return (
        <div role="alert" aria-label="列表加载失败" style={{ marginBottom: 12 }}>
            <Banner
                type="danger"
                closeIcon={null}
                description={hasData ? '更新失败，当前显示上次加载的数据。' : '加载失败，请重试。'}
                fullMode={false}
            >
                <Button theme="borderless" loading={retrying} disabled={retrying} onClick={onRetry}>
                    重试
                </Button>
            </Banner>
        </div>
    );
}

/** 仅在查询成功且没有数据时显示，避免把失败误报为空结果。 */
export function ListEmptyState({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
    return (
        <Empty title={filtered ? '没有匹配结果' : '暂无记录'} description={filtered ? '请调整筛选条件，或清空条件后重试。' : '当前还没有记录。'}>
            {filtered && <Button onClick={onReset}>清空条件</Button>}
        </Empty>
    );
}
