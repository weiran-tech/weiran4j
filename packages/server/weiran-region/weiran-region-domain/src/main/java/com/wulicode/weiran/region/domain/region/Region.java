package com.wulicode.weiran.region.domain.region;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.status.EnableStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 行政区划聚合根。 */
@Getter
@Builder(toBuilder = true)
public final class Region {

    private final @Nullable Long id;

    private final String code;

    private final String name;

    private final RegionLevel level;

    private final @Nullable String parentCode;

    private final int sort;

    private final EnableStatus status;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 返回持久化地区 ID；未持久化时视为编程错误。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("地区尚未持久化");
        }
        return this.id;
    }

    /** 校验地区自身字段与根/子级父级代码约束。 */
    public static void ensureValid(
            final String code, final String name, final RegionLevel level, final @Nullable String parentCode) {
        if (!code.matches("[0-9]{2,12}")) {
            throw BizException.badRequest("code: 必须为 2 到 12 位数字字符串");
        }
        if (name.isBlank()) {
            throw BizException.badRequest("name: 不能为空");
        }
        if (level == RegionLevel.PROVINCE && parentCode != null) {
            throw BizException.badRequest("parentCode: 省级地区不能有父级");
        }
        if (level != RegionLevel.PROVINCE && (parentCode == null || parentCode.isBlank())) {
            throw BizException.badRequest("parentCode: 市级和县级地区必须指定父级");
        }
    }

    /** 校验可否作为指定子级的父级。 */
    public void ensureCanContain(final RegionLevel childLevel) {
        if (!childLevel.isChildOf(this.level)) {
            throw BizException.badRequest("parentCode: 上级地区级别必须恰好高一级");
        }
    }

    /** 删除仅允许叶节点。 */
    public static void ensureDeletable(final boolean hasChildren) {
        if (hasChildren) {
            throw BizException.conflict("请先删除下级地区");
        }
    }
}
