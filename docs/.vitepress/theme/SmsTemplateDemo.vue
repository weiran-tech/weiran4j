<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const container = ref<HTMLElement | null>(null);
let dispose: (() => void) | undefined;
let mounted = true;

onMounted(async () => {
    const [{ createElement }, { createRoot }, { SmsTemplateDemo }] = await Promise.all([
        import('react'), import('react-dom/client'), import('../../examples/SmsTemplateDemoReact'),
    ]);
    if (!mounted || !container.value) return;
    const root = createRoot(container.value);
    root.render(createElement(SmsTemplateDemo));
    dispose = () => root.unmount();
});

onBeforeUnmount(() => {
    mounted = false;
    dispose?.();
});
</script>

<template>
    <div ref="container">正在加载模板演示…</div>
</template>
