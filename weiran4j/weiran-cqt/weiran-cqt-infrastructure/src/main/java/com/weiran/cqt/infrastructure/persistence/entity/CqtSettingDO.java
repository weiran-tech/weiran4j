package com.weiran.cqt.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code cqt_setting} 表映射（只映射读取用到的列）。
 *
 * <p>列沿用原库 {@code sc_setting}，没有框架审计字段，因此不继承 {@code AuditableDO}。
 */
@NullUnmarked
@Getter
@Setter
@TableName("cqt_setting")
public class CqtSettingDO {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private Integer ident;

    private String contents;
}
