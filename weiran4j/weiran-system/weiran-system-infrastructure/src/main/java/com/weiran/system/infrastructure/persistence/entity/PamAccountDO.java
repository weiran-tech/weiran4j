package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/**
 * {@code pam_account} 表映射。
 *
 * <p>字段与 PHP 项目 weiran-v1 的迁移
 * {@code 2018_02_27_144933_create_pam_account_table} 逐列对齐：两套系统在迁移期
 * 读写同一张表，多一列少一列都会让某一侧静默丢数据。
 *
 * <p>本类只在基础设施层内流转，绝不跨层——领域层用 {@code Account} 聚合。
 *
 * <p>标 {@code @NullUnmarked}：MyBatis 通过反射构造并逐列赋值，未被 SELECT 命中的列
 * 会保持 null，编译期无法证明任何字段非空。与其给 18 个字段逐个标 {@code @Nullable}
 * 制造噪音，不如整类退出空安全检查，并把空值处理集中在
 * {@code MyBatisAccountRepository#toDomain} 那一处映射上——那里才是边界。
 */
@NullUnmarked
@Getter
@Setter
@TableName("pam_account")
public class PamAccountDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;

    private String mobile;

    private String email;

    private Integer parentId;

    /**
     * 密码哈希。
     *
     * <p>⚠️ PHP 侧该列是 {@code varchar(45)}，只够存 32 位的历史 md5 哈希；
     * BCrypt 是固定 60 字符，迁移前必须放宽到至少 {@code varchar(72)}。
     */
    private String password;

    private String passwordKey;

    private String type;

    private Integer isEnable;

    private String disableReason;

    private LocalDateTime disableStartAt;

    private LocalDateTime disableEndAt;

    private Integer loginTimes;

    private String loginIp;

    private String regIp;

    private String regPlatform;

    private LocalDateTime loginedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
