package com.weiran.system.domain.user;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** 用户仓储端口（含用户-角色关联）。 */
public interface UserRepository {

    /** 按 ID 查找。 */
    Optional<User> findById(long id);

    /** 按用户名查找。 */
    Optional<User> findByUsername(String username);

    /** 用户名是否已存在。 */
    boolean existsByUsername(String username);

    /** 新增用户，返回 ID。 */
    long insert(User user);

    /*
     * 以下全部是定向更新：每个用例只写自己负责的列，绝不「先读后整行写回」——
     * 否则并发的两个写操作会互相覆盖（例如登录把刚被重置的密码、刚吊销的令牌版本写回旧值，
     * 或用户改资料把管理员刚设置的禁用状态写回启用）。
     */

    /** 定向更新：本人修改资料（昵称、邮箱、手机号、头像、性别）。 */
    void updateProfile(User user);

    /** 定向更新：管理员修改用户（昵称、邮箱、手机号、性别、部门、状态）。 */
    void updateAccount(User user);

    /** 定向更新：记录一次成功登录。 */
    void recordLogin(long id, String ip, LocalDateTime at);

    /** 定向更新：换密码并让令牌版本原子加一。 */
    void changePassword(long id, String passwordHash, LocalDateTime at);

    /** 定向更新：令牌版本原子加一（禁用账号时吊销已签发令牌）。 */
    void revokeTokens(long id);

    /** 删除用户及其角色关联。 */
    void deleteById(long id);

    /** 分页查询。 */
    PageResult<User> page(UserCriteria criteria, PageQuery pageQuery);

    /** 全部启用用户。 */
    List<User> findEnabled();

    /** 批量按 ID 查找。 */
    List<User> findByIds(Collection<Long> ids);

    /** 指定部门下的用户数。 */
    long countByDepartmentId(long departmentId);

    /** 用户的角色 ID。 */
    Set<Long> findRoleIds(long userId);

    /** 批量查询用户的角色 ID。 */
    Map<Long, Set<Long>> findRoleIdsByUserIds(Collection<Long> userIds);

    /** 全量覆盖用户的角色。 */
    void replaceRoles(long userId, Collection<Long> roleIds);
}
