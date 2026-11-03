package com.wulicode.weiran.region.domain.region;

import com.wulicode.weiran.framework.error.BizException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 区划 code 父子关系校验。 */
public final class RegionHierarchy {

    private final Map<String, Region> byCode;

    /** 由当前地区快照构造层级索引。 */
    public RegionHierarchy(final List<Region> regions) {
        final Map<String, Region> indexed = new HashMap<>();
        regions.forEach(region -> indexed.put(region.getCode(), region));
        this.byCode = Map.copyOf(indexed);
    }

    /** 校验指定地区父级存在、级别正确且没有形成环。 */
    public void ensureValidParent(
            final @org.jspecify.annotations.Nullable String code,
            final RegionLevel childLevel,
            final @org.jspecify.annotations.Nullable String parentCode) {
        if (childLevel == RegionLevel.PROVINCE) {
            if (parentCode != null) {
                throw BizException.badRequest("parentCode: 省级地区不能有父级");
            }
            return;
        }
        final Region parent = parentCode == null ? null : this.byCode.get(parentCode);
        if (parent == null) {
            throw BizException.badRequest("parentCode: 上级地区不存在");
        }
        if (!childLevel.isChildOf(parent.getLevel())) {
            throw BizException.badRequest("parentCode: 上级地区级别必须恰好高一级");
        }
        String currentCode = parent.getCode();
        final Set<String> visited = new HashSet<>();
        while (currentCode != null && visited.add(currentCode)) {
            if (currentCode.equals(code)) {
                throw BizException.conflict("上级地区不能是自身或下级地区");
            }
            final Region current = this.byCode.get(currentCode);
            if (current == null) {
                throw BizException.badRequest("parentCode: 上级地区层级链不完整");
            }
            currentCode = current.getParentCode();
        }
    }

    /** 校验完整快照中不存在父子循环。 */
    public static void ensureAcyclic(final List<Region> regions) {
        final RegionHierarchy hierarchy = new RegionHierarchy(regions);
        for (final Region region : regions) {
            String currentCode = region.getCode();
            final Set<String> visited = new HashSet<>();
            while (currentCode != null) {
                if (!visited.add(currentCode)) {
                    throw BizException.conflict("地区层级不能形成循环");
                }
                final Region current = hierarchy.byCode.get(currentCode);
                currentCode = current == null ? null : current.getParentCode();
            }
        }
    }
}
