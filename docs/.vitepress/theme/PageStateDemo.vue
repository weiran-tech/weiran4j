<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PageStateScene } from '../../examples/page-state-scenes';

const props = defineProps<{ scene: PageStateScene }>();

const container = ref<HTMLElement | null>(null);
let dispose: (() => void) | undefined;
let update: ((scene: PageStateScene) => void) | undefined;
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
        import('../../examples/PageStateDemoReact'),
    ]);
    if (!mounted || !container.value) return;
    const root = createRoot(container.value);
    update = (scene) => root.render(createElement(PageStateDemo, { key: scene, scene }));
    update(props.scene);
    dispose = () => root.unmount();
});

watch(() => props.scene, (scene) => update?.(scene));

onBeforeUnmount(() => {
    mounted = false;
    dispose?.();
    restoreTheme?.();
});
</script>

<template>
    <div ref="container" class="page-state-demo-host">正在加载组件预览…</div>
</template>
