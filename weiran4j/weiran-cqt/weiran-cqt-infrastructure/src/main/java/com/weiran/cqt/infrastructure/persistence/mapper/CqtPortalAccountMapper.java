package com.weiran.cqt.infrastructure.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.weiran.cqt.infrastructure.persistence.entity.CqtPortalAccountDO;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/** {@link CqtPortalAccountDO} 的 Mapper。 */
public interface CqtPortalAccountMapper extends BaseMapper<CqtPortalAccountDO> {

    /** 来源库内现有最大用户编号 + 1。 */
    @Select("SELECT COALESCE(MAX(legacy_user_id), 0) + 1 FROM cqt_portal_accounts WHERE source_database = #{source}")
    long nextLegacyUserId(@Param("source") String sourceDatabase);

    /** 重置该手机号下全部账号的密码并把令牌版本加 1（原子自增，不读后写）。 */
    @Update("UPDATE cqt_portal_accounts SET password_hash = #{hash}, token_version = token_version + 1,"
            + " updated_at = #{now} WHERE phone_value = #{phone}")
    int resetPasswordByPhone(
            @Param("phone") String phone, @Param("hash") String passwordHash, @Param("now") LocalDateTime now);
}
