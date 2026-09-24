package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code pam_permission} 表映射。
 *
 * <p>字段与 PHP 项目 weiran-v1 的迁移
 * {@code 2018_02_27_144935_create_pam_permission_table} 逐列对齐（含 {@code type} 列，
 * 该列在 design.md 初稿中被遗漏，实现前的最终复核补上，见 exec/plan.md 契约冻结记录）。
 * 本类只在基础设施层内流转，领域层用 {@code PermissionRef} 只读引用。
 */
@NullUnmarked
@Getter
@Setter
@TableName("pam_permission")
public class PamPermissionDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String title;

    private String description;

    /** {@code GROUP} 是 SQL 保留关键字，生成的 SQL 必须加引号转义（与 {@code PamBanDO#value} 同理）。 */
    @TableField("\"GROUP\"")
    private String group;

    private String root;

    private String module;

    private String type;
}
