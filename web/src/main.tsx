import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            // 认证失败重试没有意义，只会让用户多等三次才看到「请重新登录」
            retry: false,
            refetchOnWindowFocus: false,
        },
        mutations: { retry: false },
    },
});

const container = document.getElementById('root');
if (!container) {
    throw new Error('找不到 #root 挂载点');
}

createRoot(container).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>,
);
