import { Button, Input, Typography } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useNextDemoSequence } from '@/hooks/queries/demo-sequences';
import './demo.css';

const TYPE_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

export default function DemoSequencePage() {
    const [type, setType] = useState('order');
    const next = useNextDemoSequence();
    const valid = TYPE_PATTERN.test(type);

    return (
        <PageContainer title="自增序号" extra={<span className="demo-page__hint">仅 local/test 的真实数据库演示</span>}>
            <div className="demo-page__sequence">
                <label htmlFor="demo-sequence-type">标识（type）</label>
                <div className="demo-page__sequence-form">
                    <Input id="demo-sequence-type" value={type} maxLength={64} placeholder="例如 order"
                        onChange={(value) => { setType(value); next.reset(); }} />
                    <Button type="primary" theme="solid" loading={next.isPending} disabled={!valid}
                        onClick={() => void next.mutateAsync(type).catch(() => undefined)}>获取序号</Button>
                </div>
                <p className="demo-page__hint">以小写字母开头，仅支持小写字母、数字、下划线和短横线；同一标识每次增加 1。</p>
                {type && !valid && <Typography.Text type="danger">请输入有效标识，最长 64 位。</Typography.Text>}
                {next.data && <div className="demo-page__sequence-result" aria-live="polite">
                    <strong>返回结果</strong>
                    <div>类型 ID：<code>{next.data.id}</code></div>
                    <div>标识：<code>{next.data.type}</code></div>
                    <div>本次序号：<code>{next.data.sequence}</code></div>
                    <p className="demo-page__hint">同一标识的 ID 固定；唯一分配值是“标识 + 序号”。</p>
                </div>}
            </div>
        </PageContainer>
    );
}
