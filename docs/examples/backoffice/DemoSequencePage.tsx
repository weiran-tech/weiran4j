import React, { useRef, useState } from 'react';
import { Button, Input, Typography } from '@douyinfe/semi-ui';
import { PageContainer } from '@/components/PageContainer';

export default function DemoSequencePage() {
    const values = useRef(new Map<string, { id: number; sequence: number }>());
    const [type, setType] = useState('order');
    const [result, setResult] = useState<{ id: number; type: string; sequence: number }>();
    const [fail, setFail] = useState(false);
    const [error, setError] = useState(false);
    const valid = /^[a-z][a-z0-9_-]{0,63}$/.test(type);
    return <PageContainer title="自增序号">
        <div className="demo-page__sequence">
            <label>标识（type）<Input value={type} onChange={(value) => { setType(value); setResult(undefined); }} aria-label="序号标识" maxLength={64} /></label>
            <label><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} />模拟分配失败</label>
            <Button theme="solid" disabled={!valid} onClick={() => {
                setError(fail);
                if (fail) return;
                const previous = values.current.get(type);
                const next = { id: previous?.id ?? values.current.size + 1, sequence: (previous?.sequence ?? 0) + 1 };
                values.current.set(type, next);
                setResult({ type, ...next });
            }}>获取序号</Button>
            {!valid && <Typography.Text type="danger">以小写字母开头，最长 64 位，仅支持小写字母、数字、下划线和短横线。</Typography.Text>}
            {error && <Typography.Text type="danger">模拟分配失败，关闭失败开关后可重试。</Typography.Text>}
            {result && <output className="demo-page__sequence-result">类型 ID：{result.id} · 标识：{result.type} · 本次序号：{result.sequence}</output>}
            <p>本地模拟：同一标识递增，切换标识独立计数，刷新后重置；真实数据库并发和唯一性由后端测试验证。</p>
        </div>
    </PageContainer>;
}
