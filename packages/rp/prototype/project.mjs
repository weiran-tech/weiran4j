import reviews from './reviews.json' with { type: 'json' };
/** fork 项目时只需修改仓库地址；评审正文与结论始终留在 GitHub。 */
export const repository = 'weiran-tech/rp-example';
export const versionReviews = reviews;

/** 新版评审使用 Discussion；数字 Issue 登记仅保留历史兼容。 */
export { default as versionDiscussions } from './discussions.json' with { type: 'json' };
