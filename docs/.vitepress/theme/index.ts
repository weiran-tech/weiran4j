import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import ComponentGallery from './ComponentGallery.vue';

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('ComponentGallery', ComponentGallery);
    },
} satisfies Theme;
