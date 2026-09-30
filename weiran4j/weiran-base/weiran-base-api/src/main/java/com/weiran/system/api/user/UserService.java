package com.weiran.system.api.user;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.List;

/** 用户管理服务。 */
public interface UserService {

    /** 分页查询。 */
    PageResult<UserView> page(UserQuery query, PageQuery pageQuery);

    /** 详情；不存在抛 40400。 */
    UserView get(long id);

    /** 新增，返回 ID。 */
    long create(CreateUserCommand command);

    /** 修改。 */
    void update(long id, UpdateUserCommand command);

    /** 删除；内置用户与操作人自己不能删（40901）。 */
    void delete(long id, long operatorId);

    /** 管理员重置密码；令牌版本加一。 */
    void resetPassword(long id, String password);

    /** 启用用户下拉。 */
    List<UserOption> options();
}
