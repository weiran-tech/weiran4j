<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
const container = ref<HTMLElement | null>(null);
let disposed = false;
let unmount: (() => void) | undefined;
onMounted(async () => {
    const [{ createElement }, { createRoot }, { PrototypeComponentsDemo }] = await Promise.all([import('react'), import('react-dom/client'), import('../../examples/PrototypeComponentsDemo')]);
    if (disposed || !container.value) return;
    const root = createRoot(container.value);
    root.render(createElement(PrototypeComponentsDemo));
    unmount = () => root.unmount();
});
onBeforeUnmount(() => { disposed = true; unmount?.(); });
</script>
<template><div ref="container">正在加载原型组件…</div></template>
