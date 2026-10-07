package com.weiran.system.domain.identity;

import java.util.List;
import java.util.Optional;

/** 外部身份绑定仓储端口。 */
public interface UserIdentityRepository {

    /** 按外部身份查绑定。 */
    Optional<UserIdentity> findByProviderAndExternalId(String provider, String externalId);

    /** 用户的全部绑定（按绑定时间）。 */
    List<UserIdentity> findByUserId(long userId);

    /** 按 ID 查绑定。 */
    Optional<UserIdentity> findById(long id);

    /** 新增绑定，返回 ID；外部身份已被绑定时由唯一键拒绝。 */
    long insert(UserIdentity identity);

    /** 删除一条绑定。 */
    void deleteById(long id);

    /** 删除用户的全部绑定（删除用户时调用）。 */
    void deleteByUserId(long userId);
}
