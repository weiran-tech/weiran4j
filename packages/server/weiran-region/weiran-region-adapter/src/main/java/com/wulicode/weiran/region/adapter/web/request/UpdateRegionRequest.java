package com.wulicode.weiran.region.adapter.web.request;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.wulicode.weiran.region.application.region.UpdateRegionCommand;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** 更新地区请求，保留 parentCode 字段是否出现以支持根级别更新。 */
public class UpdateRegionRequest {

    @Nullable
    @Pattern(regexp = "[0-9]{2,12}")
    @Size(max = 12)
    private String code;

    @Nullable
    @Size(max = 64)
    private String name;

    @Nullable
    @Pattern(regexp = "province|city|county")
    private String level;

    @Nullable
    @Size(max = 12)
    private String parentCode;

    private boolean parentCodeProvided;

    @Nullable
    private Integer sort;

    @Nullable
    @Pattern(regexp = "enabled|disabled")
    private String status;

    /** JSON 属性绑定。 */
    public void setCode(final @Nullable String code) {
        this.code = code;
    }

    /** JSON 属性绑定。 */
    public void setName(final @Nullable String name) {
        this.name = name;
    }

    /** JSON 属性绑定。 */
    public void setLevel(final @Nullable String level) {
        this.level = level;
    }

    /** JSON 属性绑定，显式 null 表示清空父级。 */
    @JsonSetter("parentCode")
    public void setParentCode(final @Nullable String parentCode) {
        this.parentCodeProvided = true;
        this.parentCode = parentCode;
    }

    /** JSON 属性绑定。 */
    public void setSort(final @Nullable Integer sort) {
        this.sort = sort;
    }

    /** JSON 属性绑定。 */
    public void setStatus(final @Nullable String status) {
        this.status = status;
    }

    /** 转换为应用命令。 */
    public UpdateRegionCommand toCommand() {
        return new UpdateRegionCommand(
                this.code, this.name, this.level, this.parentCode, this.parentCodeProvided, this.sort, this.status);
    }
}
