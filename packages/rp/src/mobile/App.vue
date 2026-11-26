<script setup>
import { installVersionNotesShortcut, openVersionNotebook } from '../prototype/version-notes';
import { notebookContext } from '../prototype/notebook-context';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Button as VanButton, NavBar as VanNavBar, Cell as VanCell, CellGroup as VanCellGroup, Tag as VanTag, Field as VanField, Popup as VanPopup, Empty as VanEmpty, NoticeBar as VanNoticeBar, showToast } from 'vant';
import { mobilePageChanges } from '../../prototype/model.mjs';
import { mobilePages, resolveMobilePage } from '../../prototype/mobile-pages.mjs';
import ExampleForm from './pages/ExampleForm.vue';
import { runtimeBase, runtimeStorageId } from '../prototype/runtime';
import { sourceCatalog as catalog } from '../prototype/source-catalog';
import { embedMode } from '../../prototype/embed.mjs';
import { money, parseRefund } from '../../prototype/refund.mjs';

const phone = ref(null);
function notify(message) { showToast({ message, teleport: phone.value || 'body' }); }
const embedded = embedMode(location.search) === 'page';
const version = import.meta.env.VITE_PROTOTYPE_VERSION || catalog.current;
const release = catalog.releases.find((item) => item.id === version);
const rootBase = runtimeBase.replace(/mobile\/$/, '');
const backToVersion = `${rootBase}rp/versions`;
const context = new URLSearchParams(location.search);
const buildLabel = rootBase.includes('-rc-') ? '固定候选' : import.meta.env.VITE_PROTOTYPE_KIND === 'finalized' ? '已定稿快照' : '版本工作构建';

const storageKey = `prototype_mobile_${runtimeStorageId}`;
function load() { try { const saved = Number(localStorage.getItem(storageKey)); return Number.isInteger(saved) && saved >= 0 && saved <= 12800 ? saved : 0; } catch { return 0; } }
const refunded = ref(load());
const amount = ref('');
const scenario = ref(['normal', 'empty', 'failure'].includes(new URLSearchParams(location.search).get('scenario')) ? new URLSearchParams(location.search).get('scenario') : 'normal');
const error = ref('');
const refundVisible = ref(false);
const formRevision = ref(0);
const reviewVisible = ref(!embedded && new URLSearchParams(location.search).get('review') === '1');
const route = ref(location.hash || '#/orders');
const remaining = computed(() => 12800 - refunded.value);
const currentPage = computed(() => resolveMobilePage(route.value));
const directoryScope = ref(context.get('scope') === 'version' ? 'version' : 'all');
const directoryPages = computed(() => mobilePages.filter(page => directoryScope.value === 'all' || mobilePageChanges(release, `/mobile/#${page.hash}`).length));
function setDirectoryScope(value) { directoryScope.value = value; const url = new URL(location.href); url.searchParams.set('scope', value); history.replaceState(null, '', url); }
const detail = computed(() => currentPage.value?.view === 'detail');
const changes = computed(() => mobilePageChanges(release, `/mobile/${route.value.split('?')[0]}`, selectedId.value));
async function captureReview() {
    try {
        const { openReviewCapture } = await import('../prototype/review-capture');
        openReviewCapture({ version, baseline: release?.baseline, platform: 'mobile', pageId: currentPage.value?.id, page: `/mobile/${route.value}`, scenario: scenario.value, pageUrl: location.href, change: changes.value[0] });
    } catch { notify('截图工具加载失败，请重试'); }
}

const change = computed(() => changes.value[0]);
const selectedId = ref(new URLSearchParams(location.search).get('change'));
const missingChange = computed(() => selectedId.value && !changes.value.some((item) => item.id === selectedId.value));
const versionMismatch = new URLSearchParams(location.search).get('version');
function go(path) { refundVisible.value = false; const url = new URL(location.href); url.searchParams.delete('change'); url.searchParams.delete('review'); history.replaceState(null, '', url); selectedId.value = null; reviewVisible.value = false; location.hash = path; }
function notifyParent() { if (window.parent !== window) window.parent.postMessage({ type: 'prototype-mobile-context', version, path: `/mobile/${location.hash || '#/orders'}`, scenario: scenario.value }, location.origin); }
function syncRoute() { route.value = location.hash || '#/orders'; refundVisible.value = false; notifyParent(); }
function syncScenario() { const url = new URL(location.href); url.searchParams.set('scenario', scenario.value); history.replaceState(null, '', url); error.value = ''; notifyParent(); }
let removeNotesShortcut;
const notesContext = () => notebookContext(version, `/mobile/${route.value}`, 'mobile');
function reviewNotes() { const context = notesContext(); if (context) openVersionNotebook(context); }
onMounted(() => { removeNotesShortcut = installVersionNotesShortcut(notesContext); window.addEventListener('hashchange', syncRoute); notifyParent(); });
onUnmounted(() => { window.removeEventListener('hashchange', syncRoute); removeNotesShortcut?.(); });
function reset() { formRevision.value++; localStorage.removeItem(storageKey); refunded.value = 0; amount.value = ''; error.value = ''; scenario.value = 'normal'; syncScenario(); refundVisible.value = false; notify('演示已重置'); }
function submit() {
    const parsed = parseRefund(amount.value, remaining.value);
    if (parsed.error) { error.value = parsed.error; return; }
    if (scenario.value === 'failure') { error.value = '模拟退款失败，输入已保留，请切换正常场景重试'; return; }
    const next = refunded.value + parsed.cents;
    try { localStorage.setItem(storageKey, String(next)); } catch { error.value = '本地存储不可用，请检查浏览器设置'; return; }
    refunded.value = next; amount.value = ''; error.value = ''; refundVisible.value = false; notify('模拟退款成功');
}
</script>
<template>
  <div class="mobile-app" :data-prototype-embed="embedded ? 'page' : 'full'">
    <template v-if="!embedded">
      <aside class="mobile-page-sidebar" aria-label="手机端页面目录">
        <div class="mobile-page-sidebar-heading">页面目录 <span>{{ directoryPages.length }}</span></div>
        <div class="mobile-page-scope" role="group" aria-label="查看范围"><button :aria-pressed="directoryScope === 'all'" @click="setDirectoryScope('all')">全部产品</button><button :aria-pressed="directoryScope === 'version'" @click="setDirectoryScope('version')">版本改动</button></div>
        <section class="mobile-page-group"><h2>手机端产品</h2><div class="mobile-page-group-items"><a v-for="page in directoryPages" :key="page.id" :href="`#${page.hash}`" :aria-current="currentPage?.id === page.id ? 'page' : undefined" @click.prevent="go(page.hash)">{{ page.title }}</a><p v-if="!directoryPages.length" class="mobile-page-empty">本版本暂无手机端页面改动</p></div></section>
      </aside>
    </template>
    <main class="mobile-review-main">
      <header v-if="!embedded" class="mobile-heading"><div><div class="mobile-eyebrow">WEIRAN · 用户端原型</div><h1>{{ currentPage?.title || '页面不存在' }}</h1></div><div class="mobile-heading-actions"><span>{{ version }} · {{ buildLabel }}</span><a :href="backToVersion" target="_top">查看版本改动 →</a><button @click="reviewNotes">评审备注</button><button @click="captureReview">截图标注</button></div></header>
      <div class="mobile-review-grid">
      <section class="mobile-preview-column" aria-label="用户端手机预览"><div class="mobile-device"><div ref="phone" class="mobile-screen">
      <div v-if="!embedded" class="mh-status"><span>9:41</span><span aria-label="信号与电量">▮▮▮ · 100%</span></div>
      <div class="mobile-screen-content">
      <van-nav-bar v-if="!embedded" :title="currentPage?.title || '页面不存在'" :left-text="detail ? '返回' : ''" :left-arrow="detail" @click-left="go('/orders')" />
    <van-notice-bar v-if="versionMismatch && versionMismatch !== version" text="链接版本与当前构建不一致，请从版本中心打开历史快照。" />
    <template v-if="!versionMismatch || versionMismatch === version">
    <van-empty v-if="!currentPage" description="页面不存在，请使用上方导航" />
    <example-form v-else-if="currentPage.view === 'form'" :key="formRevision" :scenario="scenario" />
    <van-empty v-else-if="scenario === 'empty'" description="暂无订单，请切换到正常场景" />
    <template v-else-if="detail">
      <section class="order-hero"><van-tag type="primary">{{ remaining === 0 ? '已全额退款' : refunded ? '部分退款' : '已支付' }}</van-tag><h1>原型体验服务</h1><p>订单 DEMO-20261123</p><strong>¥128.00</strong></section>
      <van-cell-group inset><van-cell title="累计已退" :value="`¥${money(refunded)}`" /><van-cell title="剩余可退" :value="`¥${money(remaining)}`" /><van-cell title="支付方式" value="模拟支付" /><van-cell title="创建时间" value="2026-11-23 10:00" /></van-cell-group>
      <div class="action-area"><van-button block type="primary" round :disabled="remaining === 0" @click="refundVisible = true">申请模拟退款</van-button><p>仅供交互演示，不发生真实支付。</p></div>
    </template>
    <template v-else>
      <section class="welcome"><span>WEIRAN MOBILE</span><h1>订单与服务</h1><p>用一个完整流程，说明交互与业务规则。</p></section>
      <div class="order-card" role="link" tabindex="0" @click="go('/orders/demo-001')" @keydown.enter="go('/orders/demo-001')"><div class="card-top"><span>DEMO-20261123</span><van-tag type="primary">{{ remaining === 0 ? '已退款' : refunded ? '部分退款' : '已支付' }}</van-tag></div><h2>原型体验服务</h2><p>包含方案演示与交互体验</p><div class="card-bottom"><strong>¥128.00</strong><van-button size="small" round>查看详情</van-button></div></div>
    </template>
    <van-popup v-model:show="refundVisible" position="bottom" round closeable :style="{ padding: '24px 16px 32px' }"><h2>申请退款</h2><p class="muted">最多可退 ¥{{ money(remaining) }}</p><van-field v-model="amount" type="text" inputmode="decimal" label="退款金额" placeholder="输入本次退款金额" :error-message="error" /><p><button v-if="!embedded" class="change-link" @click="reviewVisible = true">{{ change?.id }} · 查看规则</button></p><van-button block type="primary" round @click="submit">确认模拟退款</van-button></van-popup>
    <van-popup v-model:show="reviewVisible" position="right" :style="{ width: '90%', height: '100%' }" closeable><div class="review-content"><h2>本页改动</h2><p class="review-local-links"><button @click="reviewNotes">本机评审备注</button><a :href="backToVersion + '?tab=review'" target="_top">查看版本评审与导出</a></p><p v-if="missingChange" role="alert">本页没有改动 {{ selectedId }}，请检查分享链接。</p><p v-if="versionMismatch && versionMismatch !== version">请先打开对应历史版本。</p><template v-else><article v-for="change in changes" :key="change.id"><span class="change-link">{{ change.id }}</span><h3>{{ change.title }}</h3><h4>原来</h4><p>{{ change.before }}</p><h4>现在</h4><p>{{ change.after }}</p><h4>业务规则</h4><ul><li v-for="rule in change.rules" :key="rule">{{ rule }}</li></ul><h4>异常处理</h4><p>{{ change.exceptions }}</p><h4>验收标准</h4><ul><li v-for="item in change.acceptance" :key="item">{{ item }}</li></ul><p class="review-local-links"><button @click="reviewNotes">本机评审备注</button><a :href="backToVersion + '?tab=review'" target="_top">查看版本评审与导出</a></p></article><p v-if="!changes.length">本页没有登记改动。</p></template></div></van-popup>
    </template>
      </div></div></div></section>
      <aside v-if="!embedded" class="mobile-review-notes">
        <section class="mobile-note-panel"><h2>本页需求 / 变动</h2><div class="mobile-note-body"><p>{{ version }} · {{ changes.length ? changes.map(item => item.id).join(' / ') : '本版无该页面变动记录' }}</p><p v-for="item in changes" :key="item.id">{{ item.after }}</p><p>路由：<code>/mobile/{{ route }}</code>；内部控件使用 Vant，业务操作仅保存本机数据。</p><button class="change-link" @click="reviewVisible = true">查看本页改动与验收标准 →</button></div></section>
        <section class="mobile-note-panel"><h2>交互场景</h2><div class="mobile-note-body"><div class="scenario"><label>演示场景 <select v-model="scenario" @change="syncScenario"><option value="normal">正常</option><option value="empty">空数据</option><option value="failure">操作失败</option></select></label><button @click="reset">重置</button></div><p>订单列表进入详情，详情支持模拟退款。空数据与操作失败可切换体验；表单示例从左侧目录进入。</p></div></section>
        <section class="mobile-note-panel"><h2>业务规则</h2><div class="mobile-note-body"><article v-for="item in changes" :key="item.id"><h3>{{ item.title }}</h3><ul><li v-for="rule in item.rules" :key="rule">{{ rule }}</li></ul><p>{{ item.exceptions }}</p></article><p v-if="!changes.length">本页没有登记改动，请从页面目录选择。</p></div></section>
      </aside>
      </div>
    </main>
  </div>
</template>
