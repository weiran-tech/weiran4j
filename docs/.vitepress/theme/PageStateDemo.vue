<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const container = ref<HTMLElement | null>(null);
let dispose: (() => void) | undefined;
let mounted = true;

onMounted(async () => {
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
});
</script>

<template>
    <div ref="container" class="page-state-demo-host">正在加载组件预览…</div>
</template>
