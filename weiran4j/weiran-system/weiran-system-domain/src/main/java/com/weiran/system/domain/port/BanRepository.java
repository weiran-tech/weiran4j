package com.weiran.system.domain.port;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.domain.rbac.Ban;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 封禁管理仓储端口。 */
public interface BanRepository {

    /** 分页查询封禁记录，按类型与账号类型可选筛选。 */
    PageResult<Ban> list(PageQuery page, @Nullable String type, @Nullable String accountType);

    /** 按 ID 查封禁记录。 */
    Optional<Ban> findById(long banId);

    /** 新增封禁记录，返回落库后的记录（含生成的 ID 与创建时间）。 */
    Ban insert(Ban ban);

    /** 更新封禁记录的可变字段。 */
    void update(Ban ban);

    /** 删除封禁记录，即解除该条封禁。 */
    void delete(long banId);
}
