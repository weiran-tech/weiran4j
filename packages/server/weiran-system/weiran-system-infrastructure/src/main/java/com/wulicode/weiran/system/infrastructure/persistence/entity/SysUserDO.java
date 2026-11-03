package com.wulicode.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wulicode.weiran.framework.persistence.AuditableDO;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code sys_user} 表映射。
 *
 * <p>密码、令牌版本、登录信息标 {@code updateStrategy = NEVER}：整行覆盖不写它们，只能走仓储里的定向更新
 * （{@code token_version = token_version + 1} 等），避免并发的「先读后整行写」把刚吊销的令牌版本写回旧值。
 *
 * <p>文字头像存为 JSON；偏好和收藏只通过专用查询与定向更新访问。
 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_user")
public class SysUserDO extends AuditableDO {

    private String username;

    private String nickname;

    @TableField(updateStrategy = FieldStrategy.NEVER)
    private String password;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String avatar;

    private String gender;

    @TableField(select = false, insertStrategy = FieldStrategy.NEVER, updateStrategy = FieldStrategy.NEVER)
    private String preferences;

    @TableField(select = false, insertStrategy = FieldStrategy.NEVER, updateStrategy = FieldStrategy.NEVER)
    private String favoriteMenus;

    private String status;

    @TableField(updateStrategy = FieldStrategy.NEVER)
    private Integer tokenVersion;

    @TableField(updateStrategy = FieldStrategy.NEVER)
    private LocalDateTime lastLoginAt;

    @TableField(updateStrategy = FieldStrategy.NEVER)
    private String lastLoginIp;

    @TableField(updateStrategy = FieldStrategy.NEVER)
    private LocalDateTime passwordUpdatedAt;

    private Boolean isBuiltin;
}
