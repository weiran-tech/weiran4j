// 必须最先导入：Semi 的 Toast / Modal 等命令式 API 在 React 19 下依赖这个适配
import '@douyinfe/semi-ui/react19-adapter';
import { LocaleProvider } from '@douyinfe/semi-ui';
import zh_CN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import { QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { config } from './config';
import { queryClient } from './lib/query';
import './styles/global.css';

dayjs.locale('zh-cn');
document.title = config.appTitle;

const container = document.getElementById('root');
if (!container) {
    throw new Error('找不到 #root 挂载点');
}

createRoot(container).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <LocaleProvider locale={zh_CN}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </LocaleProvider>
        </QueryClientProvider>
    </StrictMode>,
);
