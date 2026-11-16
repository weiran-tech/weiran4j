组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:0.2.15`。

## 本版改动

- OSS 媒体根文件夹支持 `weiran.storage.aliyun.folder` 配置，环境变量为 `WEIRAN_STORAGE_ALIYUN_FOLDER`，默认仍为 `media`。
- 直传授权与后端上传使用同一文件夹，保留历史对象 URL、删除能力及有效旧授权；本地与批处理目录保持原行为。
- 文件夹采用单级安全校验，保留原五参数配置构造入口，并补齐配置绑定、路径安全和历史兼容回归测试。

配置示例：`WEIRAN_STORAGE_ALIYUN_FOLDER=assets`，新对象路径为 `assets/u/<用户标识>/<UTC日期>/<UUID>.<扩展名>`。修改配置不会移动已有对象；已有自定义目录对象时，回退旧版代码前需保留兼容校验或完成历史对象处置。
