组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:0.2.6`。

## 本版改动

- 移除 `system:media-library:upload` 按钮权限。已登录用户可从配置表单、富文本编辑器和资源库上传文件，无需额外授予资源库上传权限。
- 资源库列表与删除继续分别受 `system:media-library:list`、`system:media-library:delete` 控制；上传仍需登录并遵守文件格式、大小与直传验收规则。

[完整变更](https://github.com/weiran-tech/weiran4j/compare/lib-v0.2.5...lib-v0.2.6)
