package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_user_role} 关联表映射（联合主键，无自增 ID）。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_user_role")
public class SysUserRoleDO {

    private Long userId;

    private Long roleId;
}
