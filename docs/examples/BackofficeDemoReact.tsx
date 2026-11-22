import type { BackofficePage } from './backoffice-pages';
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

const PAGES = { list: DemoListPage, navigation: DemoNavigationPage, fields: DemoFieldsPage, access: DemoAccessPage, config: DemoConfigPage, sequence: DemoSequencePage, batch: DemoBatchPage };
export function BackofficeDemo({ page }: { page: BackofficePage }) {
    const [allowed, setAllowed] = useState(true);
    const CurrentPage = PAGES[page];
    return <div className="page-state-demo backoffice-demo">
        <label><input type="checkbox" checked={allowed} onChange={(event) => setAllowed(event.target.checked)} />模拟操作权限</label>
        <LocalExampleProviders key={page} permissions={allowed ? ['*'] : []}><CurrentPage /></LocalExampleProviders>
    </div>;
}
