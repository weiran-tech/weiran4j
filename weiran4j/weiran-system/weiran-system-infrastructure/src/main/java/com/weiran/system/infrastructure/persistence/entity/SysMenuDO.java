package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_menu} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_menu")
public class SysMenuDO extends AuditableDO {

    private Long parentId;

    private String title;

    private String type;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String path;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String component;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String icon;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String permission;

    private Integer sort;

    private Boolean visible;

    private Boolean keepAlive;

    private Boolean isExternal;

    private String status;
}
