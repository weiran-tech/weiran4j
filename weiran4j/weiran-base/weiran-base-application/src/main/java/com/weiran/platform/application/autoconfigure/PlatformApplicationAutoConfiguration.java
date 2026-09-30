package com.weiran.platform.application.autoconfigure;

import com.weiran.framework.log.OperationLogRecorder;
import com.weiran.platform.application.config.ConfigApplicationService;
import com.weiran.platform.application.dict.DictApplicationService;
import com.weiran.platform.application.operationlog.AsyncOperationLogRecorder;
import com.weiran.platform.application.operationlog.OperationLogApplicationService;
import com.weiran.platform.domain.operationlog.OperationLogRepository;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * weiran-platform 应用层自动配置：字典、配置、操作日志服务，以及操作日志记录器。
 */
@AutoConfiguration
@Import({DictApplicationService.class, ConfigApplicationService.class, OperationLogApplicationService.class})
public class PlatformApplicationAutoConfiguration {

    /**
     * 操作日志记录器，自带专用线程池：队列有界，满了直接拒绝（记录器捕获后记 warn），不阻塞业务线程；
     * 关闭时等待已提交的日志写完（最多 10 秒）。
     */
    @Bean
    @ConditionalOnMissingBean(OperationLogRecorder.class)
    public AsyncOperationLogRecorder operationLogRecorder(final OperationLogRepository repository) {
        final ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("operation-log-");
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(2_000);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return new AsyncOperationLogRecorder(repository, executor);
    }
}
