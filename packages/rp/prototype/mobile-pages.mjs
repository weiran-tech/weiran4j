/** 只登记页面，不依赖 Vue；电脑预览与手机应用共用。 */
export const mobilePages = [
    { id: 'mobile-orders', title: '订单列表', hash: '/orders', view: 'orders', navigation: true },
    { id: 'mobile-order-detail', title: '订单详情', hash: '/orders/demo-001', view: 'detail', navigation: false },
    { id: 'mobile-form', title: '表单示例', hash: '/form', view: 'form', navigation: true },
];
export function resolveMobilePage(hash) {
    return mobilePages.find((page) => `#${page.hash}` === (hash || '#/orders').split('?')[0]) || null;
}
