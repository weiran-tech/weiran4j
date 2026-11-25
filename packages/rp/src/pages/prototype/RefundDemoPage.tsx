import { Button, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { embedMode } from '../../../prototype/embed.mjs';
import { money, parseRefund } from '../../../prototype/refund.mjs';
import { runtimeStorageId } from '@/prototype/runtime';
import '@/prototype/prototype.css';

const storageKey = `prototype_refund_${runtimeStorageId}`;
function readRefunded() {
    try { const saved = Number(localStorage.getItem(storageKey)); return Number.isInteger(saved) && saved >= 0 && saved <= 12800 ? saved : 0; } catch { return 0; }
}
export default function RefundDemoPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const embedded = embedMode(params.toString()) === 'page';
    const scenario = ['normal', 'empty', 'failure'].includes(params.get('scenario') || '') ? params.get('scenario')! : 'normal';
    function setScenario(value: string) { const next = new URLSearchParams(params); next.set('scenario', value); setParams(next, { replace: true }); }
    const [refunded, setRefunded] = useState(readRefunded);
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const remaining = 12800 - refunded;
    function submit() {
        const parsed = parseRefund(value, remaining);
        if (parsed.error) { setError(parsed.error); return; }
        if (scenario === 'failure') { setError('模拟退款失败，金额已保留。切换正常场景后可重试。'); return; }
        const next = refunded + parsed.cents!;
        try { localStorage.setItem(storageKey, String(next)); } catch { setError('本地存储不可用，请检查浏览器设置后重试'); return; }
        setRefunded(next); setValue(''); setError(''); Toast.success('模拟退款成功');
    }
    return <div className="proto-page proto-refund"><header className="proto-heading"><div><div className="proto-eyebrow">INTERACTION DEMO</div><h1>退款交互示例</h1><p className="proto-muted">此页面演示需求交接格式，独立于现有业务订单。</p></div></header>
        {!embedded && <div className="proto-filters"><label>演示场景 <select value={scenario} onChange={(event) => { setScenario(event.target.value); setError(''); }}><option value="normal">正常</option><option value="empty">空数据</option><option value="failure">退款失败</option></select></label><Button onClick={() => { localStorage.removeItem(storageKey); setRefunded(0); setValue(''); setError(''); setScenario('normal'); }}>重置演示</Button></div>}
        {scenario === 'empty' ? <div className="proto-empty">暂无可退款订单，请切换到正常场景。</div> : <section className="proto-card"><h2>订单 DEMO-20261123</h2><p className="proto-muted">原型体验服务 · 已支付</p><div className="proto-summary"><div>订单金额<strong>¥128.00</strong></div><div>累计已退<strong>¥{money(refunded)}</strong></div><div>剩余可退<strong>¥{money(remaining)}</strong></div></div>
            <form onSubmit={(event) => { event.preventDefault(); submit(); }}><label htmlFor="refund-amount">本次退款金额 </label>{!embedded && <Button size="small" theme="borderless" onClick={() => void navigate({ search: new URLSearchParams({ ...Object.fromEntries(params), review: '1', change: 'CHG-003' }).toString() })}>CHG-003 · 查看规则</Button>}<p><input id="refund-amount" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder={`最多 ¥${money(remaining)}`} aria-describedby="refund-error" /></p><p id="refund-error" role="status" style={{ color: 'var(--semi-color-danger)' }}>{error}</p><Button htmlType="submit" theme="solid" disabled={remaining === 0}>确认模拟退款</Button></form>
        </section>}
    </div>;
}
