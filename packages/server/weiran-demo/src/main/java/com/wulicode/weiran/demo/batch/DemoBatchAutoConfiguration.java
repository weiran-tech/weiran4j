package com.wulicode.weiran.demo.batch;

import com.wulicode.weiran.system.api.batch.BatchJobService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

/** local/test 批处理处理器与演示查询入口。 */
@AutoConfiguration
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
