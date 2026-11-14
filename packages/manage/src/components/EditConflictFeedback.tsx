import { Banner, Button } from '@douyinfe/semi-ui';

/** 业务页与 docs 共用的持久冲突反馈，不读取业务数据。 */
export function EditConflictFeedback({ conflict, reloading, reloadError, onReload }: {
    conflict: boolean; reloading: boolean; reloadError: boolean; onReload: () => void;
}) {
    if (!conflict) return null;
    return <Banner type="warning" closeIcon={null} description={<div role="alert">
        <p>数据已被更新，当前输入已保留。请重新加载最新数据后编辑。</p>
        {reloadError && <p>重新加载失败，输入仍已保留，请稍后重试。</p>}
        <Button onClick={onReload} loading={reloading} disabled={reloading}>重新加载最新数据</Button>
    </div>} />;
}
