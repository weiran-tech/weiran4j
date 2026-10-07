package com.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_login_log} 表映射（只追加，没有更新与审计列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_login_log")
public class SysLoginLogDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String username;

    private String ip;

    private String userAgent;

    private String browser;

    private String os;

    private String eventType;

    private String status;

    private String message;

    private LocalDateTime createdAt;
}
