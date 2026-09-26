import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_APP_TITLE = 'Weiran Admin';

// 刻意保持最小：不搬 mono4ts 的分包调优，等首屏体积真的成为问题再回去取那份经验。
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // 只用于 dev server 代理目标，不会打进客户端产物
    const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3300';

    // index.html 的 %VITE_APP_TITLE% 在变量缺失时会原样保留；production 没有 .env 文件时兜底默认标题。
    // Vite 解析用户配置之后才加载 env，并且会把带 VITE_ 前缀的 process.env 一并注入。
    if (!env.VITE_APP_TITLE) {
        process.env.VITE_APP_TITLE = DEFAULT_APP_TITLE;
    }

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            port: Number(env.VITE_PORT) || 5373,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                },
            },
        },
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./src/test-setup.ts'],
            css: false,
            // Semi 组件首次转换较慢，并行跑全量时 5s 默认值偶尔不够
            testTimeout: 20_000,
        },
    };
});
