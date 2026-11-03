package com.wulicode.weiran.region.adapter.web.request;

import com.wulicode.weiran.region.application.region.CreateRegionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** 创建地区请求。 */
public record CreateRegionRequest(
        @NotBlank @Pattern(regexp = "[0-9]{2,12}") @Size(max = 12)
        String code,

        @NotBlank @Size(max = 64) String name,
        @NotBlank @Pattern(regexp = "province|city|county") String level,
        @Nullable @Size(max = 12) String parentCode,
        @Nullable Integer sort,
        @Nullable @Pattern(regexp = "enabled|disabled") String status) {

    /** 转换为应用命令。 */
    public CreateRegionCommand toCommand() {
        return new CreateRegionCommand(
                this.code(), this.name(), this.level(), this.parentCode(), this.sort(), this.status());
    }
}
