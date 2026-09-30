package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_role_menu} 关联表映射（联合主键，无自增 ID）。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_role_menu")
public class SysRoleMenuDO {

    private Long roleId;

    private Long menuId;
}
