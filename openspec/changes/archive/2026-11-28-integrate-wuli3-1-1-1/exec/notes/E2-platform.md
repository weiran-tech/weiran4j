# E2-platform

Wuli3 1.1.1 BOM 替代直接 Boot/MP 平台，保留本仓独有版本。commons-lang3 已由 Wuli3 管理，移除旧漂移豁免；Kotlin/POI 三项差异经 dependencyInsight 核对，带理由兼容。全量 check 的 verifyFrameworkVersions 通过，运行时 166 模块中管理 107 项，保留 6 个真实豁免。

范围遵循已批准 design；无前端业务或数据库迁移修改。L7 实际证据见 ../evidence/。
