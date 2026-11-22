import '@douyinfe/semi-ui/lib/es/_base/base.css';
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import PageStateDemo from './PageStateDemo.vue';
import ComponentGallery from './ComponentGallery.vue';
import SmsTemplateDemo from './SmsTemplateDemo.vue';

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('PageStateDemo', PageStateDemo);
        app.component('ComponentGallery', ComponentGallery);
        app.component('SmsTemplateDemo', SmsTemplateDemo);
    },
} satisfies Theme;
