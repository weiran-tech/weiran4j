# E1-repository

GitHub Packages 限定 group；本机外部 read:packages 凭据已成功下载正式 BOM。CI 后端步骤最小范围注入读取身份，Docker/Compose 仅构建 secret，Turbo dev 透传包读取变量。远端 CI 尚未执行，跨仓 GITHUB_TOKEN 需按部署指南授予各包 Actions access，或专用 PACKAGES_READ_TOKEN/PACKAGES_READ_USER。

范围遵循已批准 design；无前端业务或数据库迁移修改。L7 实际证据见 ../evidence/。

Docker 重试构建成功，本地镜像 weiran4j:wuli3-check；检查确认 Wuli3 core/MySQL 1.1.1、仅一套解析器、无 demo 模块；镜像配置和构建历史中不含认证令牌。首次下载 Gradle 插件遇到 TLS 握手中断，未修改配置，重试成功。
