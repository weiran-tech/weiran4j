package com.weiran.cqt.infrastructure.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.cqt.domain.account.PasswordHasher;
import com.weiran.cqt.domain.file.FileStorage;
import com.weiran.cqt.domain.portal.PortalTokenCodec;
import com.weiran.cqt.domain.sms.SmsCodeStore;
import com.weiran.cqt.domain.sms.SmsIpCounter;
import com.weiran.cqt.domain.sms.SmsSender;
import com.weiran.cqt.infrastructure.file.LocalFileStorage;
import com.weiran.cqt.infrastructure.file.OssFileStorage;
import com.weiran.cqt.infrastructure.persistence.MybatisAccountRepository;
import com.weiran.cqt.infrastructure.persistence.MybatisRegionRepository;
import com.weiran.cqt.infrastructure.persistence.MybatisSettingRepository;
import com.weiran.cqt.infrastructure.security.BCryptPasswordHasher;
import com.weiran.cqt.infrastructure.security.JjwtPortalTokenCodec;
import com.weiran.cqt.infrastructure.sms.AliyunSmsSender;
import com.weiran.cqt.infrastructure.sms.CaffeineSmsCodeStore;
import com.weiran.cqt.infrastructure.sms.CaffeineSmsIpCounter;
import com.weiran.cqt.infrastructure.sms.DevSmsSender;
import java.nio.file.Path;
import java.time.Clock;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * weiran-cqt 基础设施自动配置：Mapper 扫描、仓储实现、前台令牌、BCrypt 与短信验证码。
 *
 * <p>Flyway 脚本在 {@code classpath:db/migration/cqt/} 下，由应用统一的 locations 递归发现。
 */
@AutoConfiguration
@MapperScan("com.weiran.cqt.infrastructure.persistence.mapper")
@EnableConfigurationProperties(CqtProperties.class)
@Import({MybatisSettingRepository.class, MybatisAccountRepository.class, MybatisRegionRepository.class})
public class CqtInfrastructureAutoConfiguration {

    /** 前台令牌编解码；密钥不合法时启动失败。 */
    @Bean
    @ConditionalOnMissingBean
    public PortalTokenCodec portalTokenCodec(final CqtProperties properties, final Clock clock) {
        return new JjwtPortalTokenCodec(
                properties.jwt().secret(), properties.jwt().ttl(), clock);
    }

    /** 前台账号密码哈希。 */
    @Bean
    @ConditionalOnMissingBean
    public PasswordHasher cqtPasswordHasher(final CqtProperties properties) {
        return new BCryptPasswordHasher(properties.bcryptStrength());
    }

    /** 验证码存储（进程内）。 */
    @Bean
    @ConditionalOnMissingBean
    public SmsCodeStore smsCodeStore() {
        return new CaffeineSmsCodeStore();
    }

    /** 短信 IP 发送计数（进程内）。 */
    @Bean
    @ConditionalOnMissingBean
    public SmsIpCounter smsIpCounter(final Clock clock) {
        return new CaffeineSmsIpCounter(clock);
    }

    /** 开发模式短信，只在 {@code weiran.cqt.sms.mode=dev} 时注册；没有任何 {@link SmsSender} 即「短信服务未配置」。 */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "weiran.cqt.sms", name = "mode", havingValue = "dev")
    public SmsSender devSmsSender(final CqtProperties properties) {
        return new DevSmsSender(properties.sms().exposeCode());
    }

    /** 阿里云短信，只在 {@code weiran.cqt.sms.mode=aliyun} 时注册；配置不全时启动失败。 */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "weiran.cqt.sms", name = "mode", havingValue = "aliyun")
    public SmsSender aliyunSmsSender(final CqtProperties properties, final ObjectMapper objectMapper) {
        return AliyunSmsSender.create(properties.sms().aliyun(), objectMapper);
    }

    /** 阿里云 OSS 文件存储，只在 {@code weiran.cqt.storage.mode=oss} 时注册；配置不全时启动失败，关闭时释放客户端。 */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "weiran.cqt.storage", name = "mode", havingValue = "oss")
    public FileStorage ossFileStorage(final CqtProperties properties) {
        return OssFileStorage.create(properties.storage().oss());
    }

    /** 本地目录文件存储（仅开发 / 测试），只在 {@code weiran.cqt.storage.mode=local} 时注册。 */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "weiran.cqt.storage", name = "mode", havingValue = "local")
    public FileStorage localFileStorage(final CqtProperties properties) {
        final CqtProperties.Local local = properties.storage().local();
        if (local.root().isBlank()) {
            throw new IllegalStateException("weiran.cqt.storage.mode=local 但未配置 weiran.cqt.storage.local.root");
        }
        return new LocalFileStorage(Path.of(local.root()), local.urlPrefix());
    }
}
