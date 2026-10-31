<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ItemKey } from './ComponentGalleryReact';

const props = defineProps<{ component: ItemKey }>();

const container = ref<HTMLElement | null>(null);
let dispose: (() => void) | undefined;
let update: ((component: ItemKey) => void) | undefined;
let mounted = true;

onMounted(async () => {
    const [{ createElement }, { createRoot }, { ComponentGallery }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./ComponentGalleryReact'),
    ]);
    if (!mounted || !container.value) return;
    const root = createRoot(container.value);
    update = (component) => root.render(createElement(ComponentGallery, { component }));
    update(props.component);
    dispose = () => root.unmount();
});

watch(() => props.component, (component) => update?.(component));

onBeforeUnmount(() => {
    mounted = false;
    dispose?.();
});
</script>

<template>
    <div ref="container" class="component-gallery-host">正在加载组件预览…</div>
</template>
