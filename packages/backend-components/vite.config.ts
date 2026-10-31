import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index', cssFileName: 'style' },
        rollupOptions: { external: [
            'react', 'react/jsx-runtime', '@douyinfe/semi-ui', 'lucide-react',
            '@tiptap/core', '@tiptap/extension-image', '@tiptap/react', '@tiptap/starter-kit',
        ] },
        cssCodeSplit: false,
    },
});
