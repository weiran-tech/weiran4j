import { fileURLToPath, URL } from 'node:url';
import postcssGlobalData from '@csstools/postcss-global-data';
import postcssCustomMedia from 'postcss-custom-media';

// 把 src/styles/breakpoints.css 里的 @custom-media 注入到每个 CSS 文件，
// 业务样式统一写 `@media (--md-down) { ... }`，与 src/lib/breakpoints.ts 同源。
export default {
    plugins: [
        postcssGlobalData({
            files: [fileURLToPath(new URL('./src/styles/breakpoints.css', import.meta.url))],
        }),
        postcssCustomMedia(),
    ],
};
