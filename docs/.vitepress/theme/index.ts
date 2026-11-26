import '@douyinfe/semi-ui/lib/es/_base/base.css';
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import BackofficeDemo from './BackofficeDemo.vue';
import PageStateDemo from './PageStateDemo.vue';
import ComponentGallery from './ComponentGallery.vue';
import SmsTemplateDemo from './SmsTemplateDemo.vue';
import PrototypeComponentsDemo from './PrototypeComponentsDemo.vue';

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('BackofficeDemo', BackofficeDemo);
        app.component('PageStateDemo', PageStateDemo);
        app.component('ComponentGallery', ComponentGallery);
        app.component('SmsTemplateDemo', SmsTemplateDemo);
        app.component('PrototypeComponentsDemo', PrototypeComponentsDemo);
    },
} satisfies Theme;
