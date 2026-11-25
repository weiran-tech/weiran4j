/** 菜单只读取文章元信息，正文在指南页面加载。 */
export const helpEntries = [
    { id: 'start', title: '快速开始', group: 'daily' },
    { id: 'onboarding', title: '下载与协作', group: 'daily' },
    { id: 'workflow', title: '岗位与流程', group: 'daily' },
    { id: 'product', title: '产品制作与演示', group: 'daily' },
    { id: 'review', title: '组织评审与结论', group: 'daily' },
    { id: 'delivery', title: '研发与验收', group: 'daily' },
    { id: 'versions', title: '版本管理与历史', group: 'daily' },
    { id: 'sharing', title: '共享记录与同步', group: 'maintenance' },
    { id: 'development', title: '本地开发与 Mock', group: 'maintenance' },
    { id: 'deployment', title: '候选与部署', group: 'maintenance' },
] as const;
export const helpPath = (id: string) => `/help/${encodeURIComponent(id)}`;
