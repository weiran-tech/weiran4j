import { Banner, Button } from '@douyinfe/semi-ui';

/** 授权刷新失败时保留最后成功快照，明确提示并提供人工恢复。 */
export function AuthorizationFeedback({ failed, loading, onRetry }: { failed: boolean; loading: boolean; onRetry: () => void }) {
    if (!failed) return null;
    return <Banner type="warning" closeIcon={null} description={<span>权限信息刷新失败，当前显示上次成功结果。 <Button disabled={loading} loading={loading} onClick={onRetry}>重试权限刷新</Button></span>} />;
}
