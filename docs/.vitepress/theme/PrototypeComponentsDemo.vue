<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PrototypeDemoKey } from '../../examples/component-catalog';
const props = defineProps<{ component?: PrototypeDemoKey }>();
let update: (() => void) | undefined;
watch(() => props.component, () => update?.());
const container = ref<HTMLElement | null>(null);
let disposed = false;
let unmount: (() => void) | undefined;
onMounted(async () => {
    const [{ createElement }, { createRoot }, { PrototypeComponentsDemo }] = await Promise.all([import('react'), import('react-dom/client'), import('../../examples/PrototypeComponentsDemo')]);
    if (disposed || !container.value) return;
    const root = createRoot(container.value);
    update = () => root.render(createElement(PrototypeComponentsDemo, { component: props.component }));
    update();
    unmount = () => root.unmount();
});
onBeforeUnmount(() => { disposed = true; unmount?.(); });
</script>
<template><div ref="container">正在加载原型组件…</div></template>
