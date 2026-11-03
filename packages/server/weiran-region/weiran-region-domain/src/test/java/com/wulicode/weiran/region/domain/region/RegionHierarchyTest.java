package com.wulicode.weiran.region.domain.region;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.status.EnableStatus;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RegionHierarchyTest {

    @Test
    @DisplayName("省级根节点和完整的直接父级链有效")
    void acceptsRootAndValidDirectParent() {
        final RegionHierarchy hierarchy = new RegionHierarchy(List.of(
                RegionHierarchyTest.region("11", RegionLevel.PROVINCE, null),
                RegionHierarchyTest.region("1101", RegionLevel.CITY, "11"),
                RegionHierarchyTest.region("110101", RegionLevel.COUNTY, "1101")));

        hierarchy.ensureValidParent(null, RegionLevel.PROVINCE, null);
        hierarchy.ensureValidParent("110101", RegionLevel.COUNTY, "1101");
    }

    @Test
    @DisplayName("父级缺失、级别不匹配和不完整的祖先链均拒绝")
    void rejectsMissingOrInvalidParentChains() {
        final RegionHierarchy hierarchy = new RegionHierarchy(List.of(
                RegionHierarchyTest.region("11", RegionLevel.PROVINCE, null),
                RegionHierarchyTest.region("1101", RegionLevel.CITY, "11"),
                RegionHierarchyTest.region("1201", RegionLevel.CITY, "99")));

        assertThatThrownBy(() -> hierarchy.ensureValidParent(null, RegionLevel.PROVINCE, "11"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> hierarchy.ensureValidParent("110101", RegionLevel.COUNTY, null))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> hierarchy.ensureValidParent("110101", RegionLevel.COUNTY, "404"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> hierarchy.ensureValidParent("110101", RegionLevel.COUNTY, "11"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> hierarchy.ensureValidParent("120101", RegionLevel.COUNTY, "1201"))
                .isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("不能把节点挂到自身或自己的后代下")
    void rejectsSelfAndDescendantAsParent() {
        final RegionHierarchy hierarchy = new RegionHierarchy(List.of(
                RegionHierarchyTest.region("11", RegionLevel.PROVINCE, null),
                RegionHierarchyTest.region("1101", RegionLevel.CITY, "11"),
                RegionHierarchyTest.region("110101", RegionLevel.COUNTY, "1101")));

        assertThatThrownBy(() -> hierarchy.ensureValidParent("1101", RegionLevel.COUNTY, "1101"))
                .isInstanceOf(BizException.class)
                .hasMessage("上级地区不能是自身或下级地区");
        assertThatThrownBy(() -> hierarchy.ensureValidParent("11", RegionLevel.COUNTY, "1101"))
                .isInstanceOf(BizException.class)
                .hasMessage("上级地区不能是自身或下级地区");
    }

    @Test
    @DisplayName("完整地区快照中的父子循环会被拒绝")
    void rejectsCyclesInSnapshot() {
        final Region province = Region.builder()
                .code("11")
                .name("北京市")
                .level(RegionLevel.PROVINCE)
                .parentCode("1101")
                .sort(0)
                .status(EnableStatus.ENABLED)
                .build();
        final Region city = Region.builder()
                .code("1101")
                .name("市辖区")
                .level(RegionLevel.CITY)
                .parentCode("11")
                .sort(0)
                .status(EnableStatus.ENABLED)
                .build();

        assertThatThrownBy(() -> RegionHierarchy.ensureAcyclic(List.of(province, city)))
                .isInstanceOf(BizException.class)
                .hasMessage("地区层级不能形成循环");
    }

    private static Region region(final String code, final RegionLevel level, final @Nullable String parentCode) {
        return Region.builder()
                .code(code)
                .name("地区" + code)
                .level(level)
                .parentCode(parentCode)
                .sort(0)
                .status(EnableStatus.ENABLED)
                .build();
    }
}
