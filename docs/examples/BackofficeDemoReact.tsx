import '@douyinfe/semi-ui/react19-adapter';
import React, { useState } from 'react';
import DemoListPage from './backoffice/DemoListPage';
import DemoNavigationPage from './backoffice/DemoNavigationPage';
import DemoFieldsPage from './backoffice/DemoFieldsPage';
import DemoAccessPage from './backoffice/DemoAccessPage';
import DemoConfigPage from './backoffice/DemoConfigPage';
import DemoSequencePage from './backoffice/DemoSequencePage';
import DemoBatchPage from './backoffice/DemoBatchPage';
import { LocalExampleProviders } from './LocalExampleProviders';
import './page-state-demo.css';
import './backoffice/demo.css';

const PAGES = { list: ['列表与筛选', DemoListPage], navigation: ['导航列表', DemoNavigationPage], fields: ['字段与标签', DemoFieldsPage], access: ['权限与入口', DemoAccessPage], config: ['配置表单', DemoConfigPage], sequence: ['自增序号', DemoSequencePage], batch: ['批处理任务', DemoBatchPage] } as const;
export function BackofficeDemo() {
    const [page, setPage] = useState<keyof typeof PAGES>('list');
    const [allowed, setAllowed] = useState(true);
    const CurrentPage = PAGES[page][1];
    return <div className="page-state-demo backoffice-demo">
        <label>选择示例页面<select aria-label="选择示例页面" value={page} onChange={(event) => setPage(event.target.value as keyof typeof PAGES)}>
            {Object.entries(PAGES).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label><input type="checkbox" checked={allowed} onChange={(event) => setAllowed(event.target.checked)} />模拟操作权限</label>
        <LocalExampleProviders key={page} permissions={allowed ? ['*'] : []}><CurrentPage /></LocalExampleProviders>
    </div>;
}
