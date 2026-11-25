import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { prototypeBuildPlugin } from './scripts/prototype-build-plugin.mjs';
import { prototypeDevPlugin } from './scripts/prototype-dev-plugin.mjs';

export default defineConfig({
    base: process.env.VITE_PROTOTYPE_BASE || '/',
    plugins: [react(), vue(), prototypeBuildPlugin(), ...(process.env.VITEST ? [] : [prototypeDevPlugin()])],
    build: { outDir: '.prototype-data/web-build', rolldownOptions: { input: { manage: fileURLToPath(new URL('./index.html', import.meta.url)), mobile: fileURLToPath(new URL('./mobile/index.html', import.meta.url)) } } },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { host: '0.0.0.0', port: 5208, strictPort: true },
    preview: { port: 5208, strictPort: true },
    test: { include: ['src/**/*.{test,spec}.{ts,tsx}'], server: { deps: { inline: true } }, environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'], css: false,
        pool: 'threads', maxWorkers: 2, testTimeout: 20_000 },
});
