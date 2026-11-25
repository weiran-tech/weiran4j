import { workErrors } from '../../prototype/version-work.mjs';
import catalog from '../../prototype/releases.json';
import resolutions from '../../prototype/conflict-resolutions.json';
import { runtimeBase, runtimeVersion } from '../prototype/runtime';
import { portalEntryPath, versionEntryPath } from '../../prototype/routes.mjs';
import { createApp } from 'vue';
import App from './App.vue';
import 'vant/lib/index.css';
import './style.css';
const path = location.pathname + location.search + location.hash;
const entry = runtimeBase === '/' ? versionEntryPath(path, runtimeVersion) : portalEntryPath(path.slice(runtimeBase.length - 1), runtimeBase);
if (entry) location.replace(entry);
else {
    const release = catalog.releases.find((item) => item.id === runtimeVersion);
    const errors = workErrors(release, catalog.releases, resolutions);
    if (errors.length) { const message = document.createElement('div'); message.setAttribute('role', 'alert'); message.textContent = errors.join('；') + '。请返回版本详情解决冲突。'; document.getElementById('app')?.append(message); }
    else createApp(App).mount('#app');
}
