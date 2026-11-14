import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import PageStateDemo from './PageStateDemo.vue';
import ComponentGallery from './ComponentGallery.vue';

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('PageStateDemo', PageStateDemo);
        app.component('ComponentGallery', ComponentGallery);
    },
} satisfies Theme;
