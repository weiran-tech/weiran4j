package com.wulicode.weiran.app.fixtures.batch;

import com.wulicode.weiran.system.api.batch.BatchJobService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

/** 集成测试专用 批处理处理器与演示查询入口。 */
@TestConfiguration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class DemoBatchAutoConfiguration {

    @Bean
    public DemoBatchItemStore demoBatchItems(final JdbcTemplate jdbc) {
        return new DemoBatchItemStore(jdbc);
    }

    @Bean
    public DemoExcelBatchProcessor demoExcelBatchProcessor(final DemoBatchItemStore items) {
        return new DemoExcelBatchProcessor(items);
    }

    @Bean
    public DemoZipBatchProcessor demoZipBatchProcessor(final DemoBatchItemStore items) {
        return new DemoZipBatchProcessor(items);
    }

    @Bean
    public DemoBatchController demoBatchController(final BatchJobService jobs, final DemoBatchItemStore items) {
        return new DemoBatchController(jobs, items);
    }
}
