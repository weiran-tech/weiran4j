import { Button, Empty, Space } from '@douyinfe/semi-ui';
import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    resetKey?: string;
    onRetry?: () => void;
    onHome?: () => void;
    onReload?: () => void;
}

/** 捕获渲染/懒加载异常；业务请求错误继续由 Query 层处理。 */
export class PageErrorBoundary extends Component<Props, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidUpdate(previous: Props) {
        if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
    }

    private retry = () => {
        this.props.onRetry?.();
        this.setState({ failed: false });
    };

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="page-container" role="alert" aria-label="页面加载失败">
                <Empty title="页面加载失败" description="页面暂时无法显示，请重试；仍未恢复时可刷新页面。">
                    <Space wrap>
                        <Button type="primary" theme="solid" onClick={this.retry}>重试</Button>
                        {this.props.onHome && <Button onClick={this.props.onHome}>返回首页</Button>}
                        <Button onClick={this.props.onReload ?? (() => window.location.reload())}>刷新页面</Button>
                    </Space>
                </Empty>
            </div>
        );
    }
}
