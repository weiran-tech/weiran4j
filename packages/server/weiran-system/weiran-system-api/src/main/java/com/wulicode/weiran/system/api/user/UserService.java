package com.wulicode.weiran.system.api.user;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.util.List;

/** 用户管理服务。 */
public interface UserService {

    /** 分页查询。 */
    PageResult<UserView> page(UserQuery query, PageQuery pageQuery);

    /** 详情；不存在抛 100002。 */
    UserView get(long id);

    /** 新增，返回 ID。 */
    long create(CreateUserCommand command);

    /** 修改。 */
    void update(long id, UpdateUserCommand command);

    /** 单字段修改用户名或手机号；调用方负责校验管理员权限或限定为本人。 */
    void updateAccountField(long id, UpdateUserAccountFieldCommand command);

    /** 删除；内置用户与操作人自己不能删（100004）。 */
    void delete(long id, long operatorId);

    /** 管理员重置密码；令牌版本加一。 */
    void resetPassword(long id, String password);

    /** 启用用户下拉。 */
    List<UserOption> options();
}
