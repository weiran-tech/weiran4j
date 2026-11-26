/** 文档目录与组件侧栏共用公开组件清单。 */
export const manageComponents = [
    ['ImageUpload', 'image-upload', '单图上传'], ['FileUpload', 'file-upload', '文件上传'],
    ['RichTextEditor', 'rich-text-editor', '富文本编辑'], ['VideoPreview', 'video-preview', '视频预览'],
    ['PdfPreview', 'pdf-preview', 'PDF 预览'], ['FileTypeIcon', 'file-type-icon', '文件类型图标'],
    ['TextAvatar', 'text-avatar', '文字头像'], ['IconPicker', 'icon-picker', '图标选择'],
    ['OptionSelect', 'option-select', '选项选择'], ['NavLogo', 'nav-logo', '应用导航品牌'],
    ['NavListPanel', 'nav-list-panel', '导航列表'], ['NavListItem', 'nav-list-item', '导航条目'],
] as const;
export const prototypeComponents = [
    ['RpScopeSwitch', 'scope-switch', '产品范围切换'], ['RpEntry', 'entry', '原型入口'],
    ['RpUpdatedAt', 'updated-at', '更新时间'], ['RpPageIdentity', 'page-identity', '页面定位'],
    ['RpQuickSearch', 'quick-search', '快捷搜索'], ['RpVersionOverview', 'version-overview', '版本概览'],
    ['RpPageDirectory', 'page-directory', '页面目录'], ['RpReviewForm', 'review-form', '评审表单'],
    ['RpPageReview', 'page-review', '页面评审'],
] as const;
export type PrototypeDemoKey = typeof prototypeComponents[number][1] | 'all';
