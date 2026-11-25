import type { Change } from './catalog';
import './prototype.css';

export function ChangeDetails({ change, anchorId, technical = true }: { change: Change; anchorId?: string; technical?: boolean }) {
    return <article className="proto-change" id={anchorId}>
        {technical && <div className="proto-eyebrow">{change.id} · {change.location}</div>}
        <h3>{change.title}</h3>
        <dl><dt>原来</dt><dd>{change.before}</dd><dt>现在</dt><dd>{change.after}</dd></dl>
        <h4>业务规则</h4><ul>{change.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        <h4>异常处理</h4><p>{change.exceptions}</p>
        <h4>验收标准</h4><ul>{change.acceptance.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>;
}
