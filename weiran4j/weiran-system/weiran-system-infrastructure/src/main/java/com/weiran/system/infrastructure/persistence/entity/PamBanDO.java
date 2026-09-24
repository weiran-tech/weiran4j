package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code pam_ban} 表映射。
 *
 * <p>字段与 PHP 项目 weiran-v1 的迁移
 * {@code 2021_04_27_183109_create_pam_ban_table} 及追加迁移
 * {@code 2021_06_29_233109_alt_pam_ban_add_account_type} 逐列对齐。
 * 本类只在基础设施层内流转，领域层用 {@code Ban} 聚合。
 */
@NullUnmarked
@Getter
@Setter
@TableName("pam_ban")
public class PamBanDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String accountType;

    private String type;

    /** {@code VALUE} 是 H2 的保留关键字（MySQL 不保留但 H2 无论方言模式都保留），生成的 SQL 必须加引号转义。 */
    @TableField("\"VALUE\"")
    private String value;

    private Long ipStart;

    private Long ipEnd;

    private String note;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
