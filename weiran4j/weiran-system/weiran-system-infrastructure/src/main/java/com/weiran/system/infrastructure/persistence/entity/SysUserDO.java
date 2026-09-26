package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.weiran.framework.persistence.AuditableDO;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code sys_user} 表映射。
 *
 * <p>可空列标 {@code updateStrategy = ALWAYS}：仓储按「整行覆盖」更新，默认的 NOT_NULL 策略会让
 * 「把邮箱清空」这类修改被静默忽略。
 *
 * <p>密码、令牌版本、登录信息标 {@code updateStrategy = NEVER}：整行覆盖不写它们，只能走仓储里的定向更新
 * （{@code token_version = token_version + 1} 等），避免并发的「先读后整行写」把刚吊销的令牌版本写回旧值。
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
    private String email;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String avatar;

    private String gender;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long departmentId;

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
