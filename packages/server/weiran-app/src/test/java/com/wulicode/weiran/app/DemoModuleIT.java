package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** 验证可选演示模块经自动配置装配，不再显式导入测试替身。 */
class DemoModuleIT extends IntegrationTestSupport {

    @Test
    @DisplayName("演示序号接口经自动配置可用，相同类型连续分配递增")
    void allocatesSequencesThroughDemoModule() {
        final String token = this.adminToken();
        final String type = IntegrationTestSupport.unique("demo");
        final var first = this.post("/api-backend/demo/sequence/next", token, Map.of("type", type));
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        final var second = this.post("/api-backend/demo/sequence/next", token, Map.of("type", type));
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(IntegrationTestSupport.data(second).path("sequence").asLong())
                .isEqualTo(IntegrationTestSupport.data(first).path("sequence").asLong() + 1);
    }

    @Test
    @DisplayName("演示表由追加迁移恢复，历史迁移只登记一次")
    void restoresDemoTableWithoutDuplicateMigrations() {
        assertThat(this.jdbc.queryForObject("select count(*) from demo_batch_item", Long.class))
                .isNotNegative();
        assertThat(this.jdbc.queryForObject(
                        "select count(*) from sys_migration where version = '202610241702' and success = 1",
                        Long.class))
                .isEqualTo(1);
        assertThat(this.jdbc.queryForObject(
                        "select count(*) from sys_migration where version = '202611251510' and success = 1",
                        Long.class))
                .isEqualTo(1);
    }
}
