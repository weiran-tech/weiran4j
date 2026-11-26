import { Tabs } from '@douyinfe/semi-ui';
import './scope-switch.css';

export function PrototypeScopeSwitch({ value, onChange }: {
    value: 'all' | 'version';
    onChange: (value: 'all' | 'version') => void;
}) {
    return <div className="prototype-scope" role="group" aria-label="查看范围"><Tabs className={`prototype-scope-switch${value === 'version' ? ' prototype-scope-switch-differences' : ''}`} type="button" size="small" activeKey={value} onChange={key => onChange(key === 'all' ? 'all' : 'version')}>
        <Tabs.TabPane tab="全部产品" itemKey="all" />
        <Tabs.TabPane tab="版本改动" itemKey="version" />
    </Tabs></div>;
}
