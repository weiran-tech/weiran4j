package com.wulicode.weiran.app.fixtures.sequence;

import com.wulicode.weiran.system.api.sequence.SequenceService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** 可选演示模块的序号分配入口。 */
@TestConfiguration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class DemoSequenceAutoConfiguration {

    @Bean
    public DemoSequenceController demoSequenceController(final SequenceService sequences) {
        return new DemoSequenceController(sequences);
    }
}
