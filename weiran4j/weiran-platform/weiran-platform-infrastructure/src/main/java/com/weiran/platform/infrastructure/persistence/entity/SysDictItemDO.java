package com.weiran.platform.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.weiran.framework.persistence.AuditableDO;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_dict_item} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_dict_item")
public class SysDictItemDO extends AuditableDO {

    private Long dictId;

    private String label;

    private String value;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String color;

    private Integer sort;

    private String status;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
