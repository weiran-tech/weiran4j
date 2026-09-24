package com.weiran.system.api.rbac;

import com.weiran.common.page.PageResult;

/** 封禁管理对外服务。删除记录即视为解除该条封禁，不存在独立的启禁用状态。 */
public interface BanService {

    /** 分页查询封禁记录列表。 */
    PageResult<BanView> list(BanQuery query);

    /** 新增封禁记录。 */
    BanView create(CreateBanCommand command);

    /** 编辑封禁记录。 */
    BanView update(long banId, UpdateBanCommand command);

    /** 删除封禁记录，即解除该条封禁。 */
    void delete(long banId);
}
