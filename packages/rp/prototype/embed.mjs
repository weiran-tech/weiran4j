/** URL 参数只影响展示，不改变菜单、权限或原型业务。 */
export function embedMode(search) {
    return new URLSearchParams(search).get('embed') === 'page' ? 'page' : 'full';
}
export function embedUrl(value, mode = 'page') {
    const url = new URL(value, 'http://prototype.local');
    if (mode === 'page') { url.searchParams.set('embed', 'page'); url.searchParams.delete('review'); }
    else url.searchParams.delete('embed');
    return url.pathname + url.search + url.hash;
}
// 对比容器中的旧快照使用同域展示适配；不修改已发布文件或业务内容。
export const PAGE_ONLY_CSS = `
.admin-sidebar,.admin-header,.admin-topbar,.admin-mobile-header,.admin-tabs-bar,.proto-workspaces,.proto-toolbar,.admin-back-top { display:none!important; }
.admin-layout { height:100dvh!important; }
.admin-content { padding:0!important; }
.proto-refund > .proto-filters,.proto-refund form > button[type="button"] { display:none!important; }
.mobile-app > .van-nav-bar,.mobile-app > .review-strip,.mobile-app > .mobile-navigation,.mobile-app > .scenario,.change-link { display:none!important; }
`;
