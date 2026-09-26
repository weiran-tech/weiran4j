package com.weiran.platform.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_operation_log} 表映射（只追加，没有更新与审计列）。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_operation_log")
public class SysOperationLogDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String username;

    private String module;

    private String description;

    private String method;

    private String path;

    private String requestBody;

    private Integer responseCode;

    private Boolean success;

    private String errorMessage;

    private Long durationMs;

    private String ip;

    private String userAgent;

    private LocalDateTime createdAt;
}
