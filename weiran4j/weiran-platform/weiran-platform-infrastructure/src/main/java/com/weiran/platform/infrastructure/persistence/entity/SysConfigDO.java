package com.weiran.platform.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_config} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_config")
public class SysConfigDO extends AuditableDO {

    private String configKey;

    private String configValue;

    private String configType;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String description;

    private Boolean isBuiltin;
}
