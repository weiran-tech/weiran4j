package com.wulicode.weiran.region.adapter.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.wulicode.weiran.framework.status.EnableStatus;
import com.wulicode.weiran.region.application.region.RegionApplicationService;
import com.wulicode.weiran.region.domain.region.Region;
import com.wulicode.weiran.region.domain.region.RegionLevel;
import com.wulicode.weiran.region.domain.region.RegionRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class RegionControllerTest {

    @Test
    @DisplayName("CSV 导出带 UTF-8 BOM、标题、筛选字段且正确转义逗号和引号")
    void exportsUtf8CsvWithEscapedCells() {
        final RegionController controller =
                new RegionController(new RegionApplicationService(new SingleRegionRepository()));

        final var response = controller.export(null, null, null);
        final String csv = new String(Objects.requireNonNull(response.getBody()), StandardCharsets.UTF_8);

        assertThat(Objects.requireNonNull(response.getHeaders().getContentType())
                        .toString())
                .isEqualTo("text/csv;charset=UTF-8");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("regions.csv");
        assertThat(csv)
                .startsWith("\uFEFFID,名称,区划代码,级别,父级代码,排序,状态,创建时间\r\n")
                .contains("1,\"东城,\"\"新区\"\"\",\"11\",\"province\",,3,\"enabled\",\"2026-10-19T12:00\"\r\n");
    }

    private static final class SingleRegionRepository implements RegionRepository {

        private final LocalDateTime timestamp = LocalDateTime.of(2026, 10, 19, 12, 0);

        private final Region region = Region.builder()
                .id(1L)
                .code("11")
                .name("东城,\"新区\"")
                .level(RegionLevel.PROVINCE)
                .parentCode(null)
                .sort(3)
                .status(EnableStatus.ENABLED)
                .createdAt(this.timestamp)
                .updatedAt(this.timestamp)
                .build();

        @Override
        public Optional<Region> findById(final long id) {
            return id == 1L ? Optional.of(this.region) : Optional.empty();
        }

        @Override
        public Optional<Region> findByCode(final String code) {
            return this.region.getCode().equals(code) ? Optional.of(this.region) : Optional.empty();
        }

        @Override
        public List<Region> findAll() {
            return List.of(this.region);
        }

        @Override
        public boolean hasChildren(final String parentCode) {
            return false;
        }

        @Override
        public long save(final Region region) {
            return 1L;
        }

        @Override
        public void deleteById(final long id) {}
    }
}
