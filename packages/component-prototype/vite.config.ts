import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [{
        name: 'prototype-auto-style',
        generateBundle(_options, bundle) {
            const entry = bundle['index.js'];
            if (entry?.type === 'chunk') entry.code = `import './style.css';\n${entry.code}`;
        },
    }],
    build: {
        lib: { entry: { index: 'src/index.ts', core: 'src/core.ts' }, formats: ['es'], fileName: '[name]', cssFileName: 'style' },
        rollupOptions: { external: id => ['react', 'react-dom', '@douyinfe/semi-ui', 'lucide-react'].some(name => id === name || id.startsWith(name + '/')) },
        cssCodeSplit: false,
    },
    test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], maxWorkers: 2 },
});
