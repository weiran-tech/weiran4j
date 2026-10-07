import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_APP_TITLE = 'Weiran Admin';

// 刻意保持最小：不搬 mono4ts 的分包调优，等首屏体积真的成为问题再回去取那份经验。
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // 契约 §4：认证 Cookie 为 SameSite=Strict、后端不开 CORS，前后端必须同源；dev 与 build 都在这里拦下绝对地址
    if (/^https?:\/\//i.test(env.VITE_API_BASE_URL ?? '')) {
        throw new Error(
            `VITE_API_BASE_URL 不能是绝对地址（当前为 ${env.VITE_API_BASE_URL}）：前后端必须同源部署（认证 Cookie SameSite=Strict、无 CORS），` +
                'VITE_API_BASE_URL 只能是路径前缀（如 /admin-api）或留空；跨域访问请在网关 / 反向代理层把接口挂到同一域名下。',
        );
    }
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
