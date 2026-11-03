package com.wulicode.weiran.system.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** {@code sys_media} 表映射。 */
@NullUnmarked
@Getter
@Setter
@TableName("sys_media")
public class SysMediaDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String originalName;

    private String url;

    private String objectName;

    private Long size;

    private Long uploadedBy;

    private Instant createdAt;
}
