<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const container = ref<HTMLElement | null>(null);
let dispose: (() => void) | undefined;
let mounted = true;
let restoreTheme: (() => void) | undefined;

onMounted(async () => {
    const previous = document.body.getAttribute('theme-mode');
    const syncTheme = () => { document.body.setAttribute('theme-mode', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    restoreTheme = () => { observer.disconnect(); if (previous === null) document.body.removeAttribute('theme-mode'); else document.body.setAttribute('theme-mode', previous); };
    const [{ createElement }, { createRoot }, { PageStateDemo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./PageStateDemoReact'),
    ]);
    if (!mounted || !container.value) return;
    const root = createRoot(container.value);
    root.render(createElement(PageStateDemo));
    dispose = () => root.unmount();
});

onBeforeUnmount(() => {
    mounted = false;
    dispose?.();
    restoreTheme?.();
});
</script>

<template>
    <div ref="container" class="page-state-demo-host">正在加载组件预览…</div>
</template>
