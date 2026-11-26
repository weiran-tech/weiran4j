import React, { Fragment, useState, type ReactNode } from 'react';
import './demo-parameters.css';
export type DemoValue = string | number | boolean | null | DemoValue[] | { [key: string]: DemoValue };
export type DemoArgs = Record<string, DemoValue>;
export interface DemoSchema { defaults: DemoArgs; presets?: readonly { label: string; values: DemoArgs }[]; choices?: Record<string, readonly DemoValue[]>; validate?: (args: DemoArgs) => void }
function validate(value: DemoValue, sample: DemoValue, path: string): void {
    if (sample === null) { if (value !== null && typeof value !== 'string') throw new Error(`${path} 应为空值或字符串`); return; }
    if (Array.isArray(sample)) {
        if (!Array.isArray(value)) throw new Error(`${path} 应为数组`);
        if (sample[0] !== undefined) value.forEach((item, index) => validate(item, sample[0]!, `${path}[${index}]`));
        else if (value.some(item => typeof item !== 'string')) throw new Error(`${path} 的条目应为字符串`);
    } else if (sample !== null && typeof sample === 'object') {
        if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(`${path} 应为对象`);
        for (const [key, template] of Object.entries(sample)) validate(value[key]!, template, `${path}.${key}`);
        if (Object.keys(value).some(key => !Object.hasOwn(sample, key))) throw new Error(`${path} 包含未提供的参数`);
    } else if (typeof value !== typeof sample || value === null !== (sample === null)) throw new Error(`${path} 类型不符`);
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0 || value > 100000)) throw new Error(`${path} 应为 0–100000 的数字`);
    if (typeof value === 'string' && /^(?:javascript|data|vbscript):/i.test(value.trim())) throw new Error(`${path} 不支持可执行协议`);
}
export function DemoParameters({ name, schema, children }: { name: string; schema: DemoSchema; children: (args: DemoArgs) => ReactNode }) {
    const [args, setArgs] = useState(schema.defaults);
    const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(schema.defaults).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)])));
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState('');
    const [preset, setPreset] = useState('default');
    function reset() {
        setPreset('default');
        setArgs(schema.defaults); setDraft(Object.fromEntries(Object.entries(schema.defaults).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)])));
        setError(''); setRevision(value => value + 1);
    }
    function update(nextDraft: Record<string, string>, selected = 'custom') {
        setPreset(selected);
        setDraft(nextDraft);
        try {
            const next: DemoArgs = {};
            for (const [key, sample] of Object.entries(schema.defaults)) {
                const text = nextDraft[key] ?? '';
                const value = typeof sample === 'string' ? text : JSON.parse(text) as DemoValue;
                validate(value, sample, key);
                if (schema.choices?.[key] && !schema.choices[key]!.includes(value)) throw new Error(`${key} 不在可选值中`);
                next[key] = value;
            }
            schema.validate?.(next);
            setArgs(next); setError(''); setRevision(value => value + 1);
        } catch (reason) { setError(reason instanceof Error ? reason.message : '参数格式不正确'); }
    }
    return <section className="demo-parameters" aria-label={`${name} 参数演示`}>
        <form onSubmit={event => event.preventDefault()} className="demo-parameters__form"><h3>自定义参数</h3><p>修改参数即刻更新预览。回调由演示提供，结构化数据使用 JSON；格式不完整时保留上一次有效预览。</p>
            <label className="demo-parameters__presets">参数组合<select aria-label="参数组合" value={preset} onChange={event => {
                const selected = event.target.value;
                const values = selected === 'default' ? schema.defaults : { ...schema.defaults, ...schema.presets![Number(selected)]!.values };
                update(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)])), selected);
            }}><option value="default">默认组合</option>{schema.presets?.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}<option value="custom" disabled>自定义组合</option></select></label>
            <div className="demo-parameters__fields">{Object.entries(schema.defaults).map(([key, value]) => <label key={key}><code>{key}</code>{schema.choices?.[key] ? <select aria-label={`参数 ${key}`} value={draft[key]} onChange={event => update({ ...draft, [key]: event.target.value })}>{schema.choices[key]!.map(choice => <option key={String(choice)} value={String(choice)}>{String(choice)}</option>)}</select> : typeof value === 'boolean' ? <input aria-label={`参数 ${key}`} type="checkbox" checked={draft[key] === 'true'} onChange={event => update({ ...draft, [key]: String(event.target.checked) })} /> : typeof value === 'object' ? <textarea aria-label={`参数 ${key}`} rows={5} value={draft[key]} onChange={event => update({ ...draft, [key]: event.target.value })} spellCheck={false} /> : <input aria-label={`参数 ${key}`} type={typeof value === 'number' ? 'number' : 'text'} value={draft[key]} onChange={event => update({ ...draft, [key]: event.target.value })} />}</label>)}</div>
            {error && <p role="alert">{error}</p>}<div className="demo-parameters__actions"><button type="button" onClick={reset}>重置参数</button></div>
        </form>
        <div className="demo-parameters__preview"><h3>实时预览</h3><Fragment key={revision}>{children(args)}</Fragment></div>
        <details><summary>查看当前参数</summary><pre>{JSON.stringify(args, null, 2)}</pre></details>
    </section>;
}
