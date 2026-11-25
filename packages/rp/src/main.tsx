// 必须最先导入：Semi 的 Toast / Modal 等命令式 API 在 React 19 下依赖这个适配
import '@douyinfe/semi-ui/react19-adapter';
import { LocaleProvider } from '@douyinfe/semi-ui';
import zh_CN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import { QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation } from 'react-router-dom';
import { App } from './App';
import { portalEntryPath, versionEntryPath } from '../prototype/routes.mjs';
import { runtimeVersion } from './prototype/runtime';
import { runtimeBase } from './prototype/runtime';
import { PortalRouter, navigatePortal } from './prototype/PortalRouter';
import { config } from './config';
import { queryClient } from './lib/query';
import { PreferencesProvider } from './hooks/PreferencesProvider';
import { bootstrapTheme } from './lib/preferences-storage';
import { ThemeProvider } from './providers/ThemeProvider';
import './styles/global.css';

dayjs.locale('zh-cn');
document.title = config.appTitle;
// 挂载前同步应用已存主题（偏好里的明暗 + 主色；顺带迁移旧版 prototype_theme），避免深色用户首屏闪白
bootstrapTheme();

const container = document.getElementById('root');
if (!container) {
    throw new Error('找不到 #root 挂载点');
}

function VersionRouteBoundary() {
    const location = useLocation();
    const path = location.pathname + location.search + location.hash;
    const entry = portalEntryPath(path, runtimeBase) ?? (runtimeBase === '/' ? versionEntryPath(path, runtimeVersion) : null);
    useEffect(() => { if (entry && !navigatePortal(entry, true)) window.location.replace(entry); }, [entry]);
    return entry ? <div role="status">正在进入对应版本…</div> : <App />;
}

createRoot(container).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <LocaleProvider locale={zh_CN}>
                <PreferencesProvider>
                    <ThemeProvider>
                        <PortalRouter>
                            <VersionRouteBoundary />
                        </PortalRouter>
                    </ThemeProvider>
                </PreferencesProvider>
            </LocaleProvider>
        </QueryClientProvider>
    </StrictMode>,
);
