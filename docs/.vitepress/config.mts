import { fileURLToPath } from 'node:url'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  vite: { resolve: { alias: { '@': fileURLToPath(new URL('../../packages/manage/src', import.meta.url)) } } },
  base: process.env.VITEPRESS_BASE || '/',
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
      { text: '公共组件', link: '/components/' },
      { text: '页面状态', link: '/page-states' },
      { text: 'OpenAPI', link: '/openapi' },
      { text: '部署与运维', link: '/deployment' },
    ],
    sidebar: [
      {
        text: '项目文档',
        items: [
          { text: '首页', link: '/' },
          { text: '使用指南', link: '/usage' },
          { text: '架构说明', link: '/architecture' },
          { text: '系统配置', link: '/configuration' },
          { text: '公共组件', link: '/components/', items: [
            { text: '组件总览', link: '/components/' },
            { text: 'ImageUpload', link: '/components/image-upload' },
            { text: 'FileUpload', link: '/components/file-upload' },
            { text: 'RichTextEditor', link: '/components/rich-text-editor' },
            { text: 'VideoPreview', link: '/components/video-preview' },
            { text: 'PdfPreview', link: '/components/pdf-preview' },
            { text: 'FileTypeIcon', link: '/components/file-type-icon' },
            { text: 'TextAvatar', link: '/components/text-avatar' },
            { text: 'IconPicker', link: '/components/icon-picker' },
            { text: 'OptionSelect', link: '/components/option-select' },
            { text: 'NavListPanel', link: '/components/nav-list-panel' },
            { text: 'NavListItem', link: '/components/nav-list-item' },
          ] },
          { text: '页面状态演示', link: '/page-states' },
          { text: 'OpenAPI 与 Swagger UI', link: '/openapi' },
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
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Java 21 · React · Spring Boot',
    },
  },
})
