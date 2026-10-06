package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_user_identity} 行（MyBatis 反射填充，空值在仓储映射边界处理）。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_user_identity")
public class SysUserIdentityDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String provider;

    private String externalId;

    private String displayName;

    private LocalDateTime createdAt;

    private Long createdBy;
}
