package com.wulicode.weiran.region.application.region;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.status.EnableStatus;
import com.wulicode.weiran.region.api.region.RegionErrors;
import com.wulicode.weiran.region.api.region.RegionNode;
import com.wulicode.weiran.region.domain.region.Region;
import com.wulicode.weiran.region.domain.region.RegionLevel;
import com.wulicode.weiran.region.domain.region.RegionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RegionApplicationServiceTest {

    @Test
    @DisplayName("关键词命中县级地区时保留祖先，管理树同级按 ID 倒序")
    void treeIncludesAncestorsAndSortsSiblingIdsDescending() {
        final FakeRegionRepository repository = RegionApplicationServiceTest.seededRepository();
        final RegionApplicationService service = new RegionApplicationService(repository);

        final List<RegionNode> tree = service.tree(new RegionFilter("东华门", null, null));

        assertThat(tree).hasSize(1);
        assertThat(tree.getFirst().code()).isEqualTo("11");
        assertThat(tree.getFirst().children()).extracting(RegionNode::id).containsExactly(2L);
        assertThat(tree.getFirst().children().getFirst().children())
                .extracting(RegionNode::code)
                .containsExactly("110101");

        final List<RegionNode> all = service.tree(new RegionFilter(null, null, null));
        assertThat(all.getFirst().children()).extracting(RegionNode::id).containsExactly(3L, 2L);
    }

    @Test
    @DisplayName("停用祖先会连同启用后代一起从 lookup 树排除")
    void lookupExcludesDescendantsOfDisabledAncestor() {
        final FakeRegionRepository repository = RegionApplicationServiceTest.seededRepository();
        repository.replace(repository.rows().stream()
                .map(region -> region.getCode().equals("11")
                        ? region.toBuilder().status(EnableStatus.DISABLED).build()
                        : region)
                .toList());
        final RegionApplicationService service = new RegionApplicationService(repository);

        assertThat(service.enabledTree()).isEmpty();
    }

    @Test
    @DisplayName("已有地区 code 不可修改")
    void refusesCodeChanges() {
        final RegionApplicationService service =
                new RegionApplicationService(RegionApplicationServiceTest.seededRepository());

        assertThatThrownBy(() -> service.update(1L, new UpdateRegionCommand("12", null, null, null, false, null, null)))
                .isInstanceOf(BizException.class)
                .hasMessage("区划代码不可修改");
    }

    @Test
    @DisplayName("更改级别不能破坏已有子级的直接层级")
    void refusesLevelChangeThatInvalidatesChildren() {
        final RegionApplicationService service =
                new RegionApplicationService(RegionApplicationServiceTest.seededRepository());

        assertThatThrownBy(
                        () -> service.update(1L, new UpdateRegionCommand(null, null, "city", null, false, null, null)))
                .isInstanceOfSatisfying(
                        BizException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(RegionErrors.INVALID_HIERARCHY));
    }

    @Test
    @DisplayName("删除含子级地区使用稳定地区错误码拒绝")
    void rejectsDeletingParentRegion() {
        final RegionApplicationService service =
                new RegionApplicationService(RegionApplicationServiceTest.seededRepository());

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOfSatisfying(
                        BizException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(RegionErrors.HAS_CHILDREN));
    }

    private static FakeRegionRepository seededRepository() {
        final FakeRegionRepository repository = new FakeRegionRepository();
        final LocalDateTime now = LocalDateTime.of(2026, 10, 19, 12, 0);
        repository.replace(List.of(
                RegionApplicationServiceTest.region(
                        1L, "11", "北京市", RegionLevel.PROVINCE, null, EnableStatus.ENABLED, now),
                RegionApplicationServiceTest.region(
                        2L, "1101", "东城区", RegionLevel.CITY, "11", EnableStatus.ENABLED, now),
                RegionApplicationServiceTest.region(
                        3L, "1102", "西城区", RegionLevel.CITY, "11", EnableStatus.ENABLED, now),
                RegionApplicationServiceTest.region(
                        4L, "110101", "东华门街道", RegionLevel.COUNTY, "1101", EnableStatus.ENABLED, now)));
        return repository;
    }

    private static Region region(
            final long id,
            final String code,
            final String name,
            final RegionLevel level,
            final @Nullable String parentCode,
            final EnableStatus status,
            final LocalDateTime now) {
        return Region.builder()
                .id(id)
                .code(code)
                .name(name)
                .level(level)
                .parentCode(parentCode)
                .sort(0)
                .status(status)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private static final class FakeRegionRepository implements RegionRepository {

        private final List<Region> regions = new ArrayList<>();

        @Override
        public Optional<Region> findById(final long id) {
            return this.regions.stream()
                    .filter(region -> region.requireId() == id)
                    .findFirst();
        }

        @Override
        public Optional<Region> findByCode(final String code) {
            return this.regions.stream()
                    .filter(region -> region.getCode().equals(code))
                    .findFirst();
        }

        @Override
        public List<Region> findAll() {
            return List.copyOf(this.regions);
        }

        @Override
        public boolean hasChildren(final String parentCode) {
            return this.regions.stream().anyMatch(region -> parentCode.equals(region.getParentCode()));
        }

        @Override
        public long save(final Region region) {
            final long id = region.getId() == null
                    ? this.regions.stream().mapToLong(Region::requireId).max().orElse(0) + 1
                    : region.getId();
            this.regions.removeIf(existing -> existing.requireId() == id);
            this.regions.add(region.toBuilder()
                    .id(id)
                    .createdAt(LocalDateTime.of(2026, 10, 19, 12, 0))
                    .updatedAt(LocalDateTime.of(2026, 10, 19, 12, 0))
                    .build());
            return id;
        }

        @Override
        public void deleteById(final long id) {
            this.regions.removeIf(region -> region.requireId() == id);
        }

        private List<Region> rows() {
            return List.copyOf(this.regions);
        }

        private void replace(final List<Region> rows) {
            this.regions.clear();
            this.regions.addAll(rows);
        }
    }
}
