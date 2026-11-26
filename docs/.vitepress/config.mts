import { manageComponents, prototypeComponents } from '../examples/component-catalog'
import { backofficePages } from '../examples/backoffice-pages'
import { pageStateScenes } from '../examples/page-state-scenes'
import { fileURLToPath } from 'node:url'
import { withMermaid } from 'vitepress-plugin-mermaid'
import managePostcss from '../../packages/manage/postcss.config.js'

const demoSidebar = [
  { text: '页面状态演示', collapsed: false, items: [
    { text: '场景总览', link: '/page-states' },
    ...pageStateScenes.map((scene) => ({ text: scene.title, link: `/page-states/${scene.id}` })),
  ] },
  { text: '后台页面示例', collapsed: false, items: [
    { text: '示例总览', link: '/backoffice-examples' },
    ...backofficePages.map((page) => ({ text: page.title, link: `/backoffice-examples/${page.id}` })),
  ] },
  { text: '演示开发约定', link: '/examples/' },
]

const componentSidebar = [
  { text: '组件总览', link: '/components/' },
  { text: 'Manage · 后台组件', link: '/components/manage/', collapsed: false, items: [
    ...manageComponents.map(([text, slug]) => ({ text, link: `/components/manage/${slug}` })),
    { text: '工具函数与类型', link: '/components/manage/utilities' },
  ] },
  { text: 'Prototype · 原型组件', link: '/components/prototype/', collapsed: false, items: [
    ...prototypeComponents.map(([text, slug]) => ({ text, link: `/components/prototype/${slug}` })),
    { text: '模型、存储与导出', link: '/components/prototype/core' },
  ] },
  { text: '安装与发布', link: '/releases' },
]

const config = withMermaid({
  vite: { css: { postcss: managePostcss }, resolve: { alias: { '@': fileURLToPath(new URL('../../packages/manage/src', import.meta.url)) } } },
  base: '/',
  sitemap: { hostname: 'https://weiran4j.wulicode.com' },
  lang: 'zh-CN',
  title: 'weiran4j',
  description: '后台管理框架的使用指南与架构说明',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '使用指南', link: '/usage' },
      { text: '架构说明', link: '/architecture' },
      { text: '系统配置', link: '/configuration' },
      { text: '组件', link: '/components/', activeMatch: '^/components/' },
      { text: '演示', link: '/page-states', activeMatch: '^/(?:page-states|backoffice-examples|examples)(?:/|$)' },
      { text: 'OpenAPI', link: '/openapi' },
      { text: '测试', link: '/testing/' },
      { text: '部署与运维', link: '/deployment' },
    ],
    sidebar: {
      '/components/': componentSidebar,
      '/page-states': demoSidebar,
      '/backoffice-examples': demoSidebar,
      '/examples/': demoSidebar,
      '/': [
      {
        text: '项目文档',
        items: [
          { text: '首页', link: '/' },
          { text: '使用指南', link: '/usage' },
          { text: '架构说明', link: '/architecture' },
          { text: '系统配置', link: '/configuration' },
          { text: '组件文档', link: '/components/' },
          { text: 'OpenAPI 与 Swagger UI', link: '/openapi' },
          { text: '测试框架基线', link: '/testing/', items: [
            { text: '项目测试入口', link: '/testing' },
            { text: '工作区与声明', link: '/testing/structure' },
            { text: '运行与检查', link: '/testing/running' },
            { text: '编写流程', link: '/testing/writing-flows' },
            { text: '证据与报告', link: '/testing/evidence' },
            { text: '资源与恢复', link: '/testing/resources' },
            { text: '覆盖与验收口径', link: '/testing/coverage' },
          ] },
          { text: '业务定义', link: '/biz/', items: [
            { text: '身份与权限', link: '/biz/identity-access/' },
            { text: '基础配置', link: '/biz/configuration/' },
            { text: '行政区划扩展', link: '/biz/region/' },
          ] },
          { text: '接口与数据约定', link: '/contracts' },
          { text: '资源库引用与删除', link: '/资源库引用与删除设计' },
          { text: '批处理任务', link: '/batch-processing' },
          { text: '自增序号', link: '/sequence' },
          { text: '部署与运维', link: '/deployment' },
          { text: '环境变量与配置模板', link: '/environment' },
          { text: '关键设计决策', link: '/design-decisions' },
        ],
      },
      ],
    },
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Java 21 · React · Spring Boot',
    },
  },
})

// 插件添加的是 Mermaid 的间接依赖；pnpm 隔离安装时需从 Mermaid 解析。
const mermaidDeps = new Set(['@braintree/sanitize-url', 'dayjs', 'debug', 'cytoscape-cose-bilkent', 'cytoscape'])
const optimizeDeps = config.vite?.optimizeDeps
if (optimizeDeps?.include) {
  optimizeDeps.include = [
    // Mermaid 在插件的异步 Vue 组件中引入，显式预构建以转换 fastdom 等 CommonJS 依赖。
    'mermaid',
    ...optimizeDeps.include.map((dep) => mermaidDeps.has(dep) ? `mermaid > ${dep}` : dep),
  ]
}

export default config
