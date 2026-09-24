import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 刻意保持最小。mono4ts 的 vite 配置里有大段 semi-ui / rolldown 分包调优，
// 那些是它在自己的体积问题上一次次踩出来的结论，不是通用最佳实践 ——
// 照抄过来只会在 weiran4j 还没有体积问题时就先背上一份看不懂的复杂度。
// 等首屏体积真的成为问题，再回去取那份经验。
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // 只用于 dev server 代理目标，不会打进客户端产物
    const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3300';

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
                // Java 后端默认跑在 3300，与 weiran-app/src/main/resources/application.yml 的
                // WEIRAN_PORT 默认值一致。
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
        },
    };
});
