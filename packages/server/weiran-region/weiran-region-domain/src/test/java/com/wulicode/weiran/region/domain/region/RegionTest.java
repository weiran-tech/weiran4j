package com.wulicode.weiran.region.domain.region;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RegionTest {

    @Test
    @DisplayName("级别值只接受省市县并保持递进关系")
    void parsesLevelsAndChecksDirectChild() {
        assertThat(RegionLevel.of("province")).isEqualTo(RegionLevel.PROVINCE);
        assertThat(RegionLevel.of("city")).isEqualTo(RegionLevel.CITY);
        assertThat(RegionLevel.of("county")).isEqualTo(RegionLevel.COUNTY);
        assertThat(RegionLevel.PROVINCE.value()).isEqualTo("province");
        assertThat(RegionLevel.CITY.value()).isEqualTo("city");
        assertThat(RegionLevel.COUNTY.value()).isEqualTo("county");
        assertThat(RegionLevel.PROVINCE.depth()).isEqualTo(1);
        assertThat(RegionLevel.CITY.depth()).isEqualTo(2);
        assertThat(RegionLevel.COUNTY.depth()).isEqualTo(3);
        assertThat(RegionLevel.CITY.isChildOf(RegionLevel.PROVINCE)).isTrue();
        assertThat(RegionLevel.COUNTY.isChildOf(RegionLevel.CITY)).isTrue();
        assertThat(RegionLevel.COUNTY.isChildOf(RegionLevel.PROVINCE)).isFalse();
        assertThatThrownBy(() -> RegionLevel.of("town")).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("持久化地区必须具有 ID")
    void requiresPersistedId() {
        final Region persisted = Region.builder()
                .id(11L)
                .code("11")
                .name("北京市")
                .level(RegionLevel.PROVINCE)
                .sort(0)
                .build();
        final Region transientRegion = Region.builder()
                .code("12")
                .name("天津市")
                .level(RegionLevel.PROVINCE)
                .sort(1)
                .build();

        assertThat(persisted.requireId()).isEqualTo(11L);
        assertThatThrownBy(transientRegion::requireId)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("地区尚未持久化");
    }

    @Test
    @DisplayName("校验省市县的父级字段")
    void validatesParentRules() {
        Region.ensureValid("11", "北京市", RegionLevel.PROVINCE, null);
        Region.ensureValid("1101", "北京市", RegionLevel.CITY, "11");
        Region.ensureValid("110101", "东城区", RegionLevel.COUNTY, "1101");

        assertThatThrownBy(() -> Region.ensureValid("11", "北京市", RegionLevel.PROVINCE, "10"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> Region.ensureValid("1101", "北京市", RegionLevel.CITY, null))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> Region.ensureValid("abc", "北京市", RegionLevel.PROVINCE, null))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> Region.ensureValid("11", "  ", RegionLevel.PROVINCE, null))
                .isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("父级级别必须恰好高一级")
    void requiresImmediateParentLevel() {
        final Region province = Region.builder()
                .code("110000")
                .name("北京市")
                .level(RegionLevel.PROVINCE)
                .sort(0)
                .build();

        province.ensureCanContain(RegionLevel.CITY);
        assertThatThrownBy(() -> province.ensureCanContain(RegionLevel.COUNTY)).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("只允许删除没有子级的地区")
    void onlyLeafRegionsAreDeletable() {
        Region.ensureDeletable(false);
        assertThatThrownBy(() -> Region.ensureDeletable(true)).isInstanceOf(BizException.class);
    }
}
