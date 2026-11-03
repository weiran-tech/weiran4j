package com.wulicode.weiran.system.infrastructure.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.auth.TokenCodec;
import com.wulicode.weiran.system.domain.auth.TokenIssuerReader;
import com.wulicode.weiran.system.domain.auth.TokenVerifier;
import com.wulicode.weiran.system.domain.auth.TrustedDeviceTokens;
import com.wulicode.weiran.system.domain.batch.BatchFileStorage;
import com.wulicode.weiran.system.domain.identity.ExternalIdentityProviders;
import com.wulicode.weiran.system.domain.identity.SsoStateSigner;
import com.wulicode.weiran.system.domain.sms.SmsSender;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import com.wulicode.weiran.system.domain.storage.FileStorage;
import com.wulicode.weiran.system.domain.user.PasswordHasher;
import com.wulicode.weiran.system.infrastructure.identity.AuthProvidersProperties;
import com.wulicode.weiran.system.infrastructure.identity.ConfiguredExternalIdentityProviders;
import com.wulicode.weiran.system.infrastructure.identity.HmacSsoStateSigner;
import com.wulicode.weiran.system.infrastructure.persistence.JdbcBatchJobRepository;
import com.wulicode.weiran.system.infrastructure.persistence.JdbcMediaReferenceRepository;
import com.wulicode.weiran.system.infrastructure.persistence.JdbcSecuritySettingsRepository;
import com.wulicode.weiran.system.infrastructure.persistence.JdbcSequenceRepository;
import com.wulicode.weiran.system.infrastructure.persistence.MybatisLoginLogRepository;
import com.wulicode.weiran.system.infrastructure.persistence.MybatisMediaRepository;
import com.wulicode.weiran.system.infrastructure.persistence.MybatisMenuRepository;
import com.wulicode.weiran.system.infrastructure.persistence.MybatisRoleRepository;
import com.wulicode.weiran.system.infrastructure.persistence.MybatisUserIdentityRepository;
import com.wulicode.weiran.system.infrastructure.persistence.MybatisUserRepository;
import com.wulicode.weiran.system.infrastructure.security.AuthJwtProperties;
import com.wulicode.weiran.system.infrastructure.security.BCryptPasswordHasher;
import com.wulicode.weiran.system.infrastructure.security.HmacTrustedDeviceTokens;
import com.wulicode.weiran.system.infrastructure.security.JwtIssuerReader;
import com.wulicode.weiran.system.infrastructure.security.JwtTokenCodec;
import com.wulicode.weiran.system.infrastructure.security.SystemSecurityProperties;
import com.wulicode.weiran.system.infrastructure.sms.AliyunSmsSender;
import com.wulicode.weiran.system.infrastructure.sms.DisabledSmsSender;
import com.wulicode.weiran.system.infrastructure.sms.LocalSmsSender;
import com.wulicode.weiran.system.infrastructure.sms.SystemSmsProperties;
import com.wulicode.weiran.system.infrastructure.storage.ConfiguredBatchFileStorage;
import com.wulicode.weiran.system.infrastructure.storage.DisabledFileStorage;
import com.wulicode.weiran.system.infrastructure.storage.LocalFileStorage;
import com.wulicode.weiran.system.infrastructure.storage.OssFileStorage;
import com.wulicode.weiran.system.infrastructure.storage.SystemStorageProperties;
import java.time.Clock;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * weiran-system 基础设施自动配置：Mapper 扫描、仓储实现、本地 JWT（签发 / 校验 / 读签发方）与 BCrypt。
 *
 * <p>Flyway 脚本在 {@code classpath:db/migration/system/} 下，由应用统一的
 * {@code spring.flyway.locations=classpath:db/migration} 递归发现，不需要在这里登记。
 */
@AutoConfiguration
@MapperScan("com.wulicode.weiran.system.infrastructure.persistence.mapper")
@EnableConfigurationProperties({
    SystemSecurityProperties.class,
    AuthJwtProperties.class,
    AuthProvidersProperties.class,
    SystemStorageProperties.class,
    SystemSmsProperties.class
})
@Import({
    MybatisUserRepository.class,
    MybatisRoleRepository.class,
    MybatisMenuRepository.class,
    MybatisLoginLogRepository.class,
    MybatisUserIdentityRepository.class,
    MybatisMediaRepository.class,
    JdbcBatchJobRepository.class,
    JdbcMediaReferenceRepository.class,
    JdbcSequenceRepository.class,
    JdbcSecuritySettingsRepository.class
})
public class SystemInfrastructureAutoConfiguration {

    @Bean
    public TrustedDeviceTokens trustedDeviceTokens(final AuthJwtProperties properties, final Clock clock) {
        return new HmacTrustedDeviceTokens(properties, clock);
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean(BatchFileStorage.class)
    public ConfiguredBatchFileStorage batchFileStorage(final SystemStorageProperties properties) {
        return new ConfiguredBatchFileStorage(properties);
    }

    @Bean
    @ConditionalOnMissingBean(SmsSender.class)
    public SmsSender systemSmsSender(
            final SystemSmsProperties properties, final ObjectMapper objectMapper, final SmsSettings smsSettings) {
        return switch (properties.mode()) {
            case "disabled" -> new DisabledSmsSender();
            case "local" -> new LocalSmsSender(objectMapper);
            case "aliyun" -> AliyunSmsSender.create(properties, smsSettings, objectMapper);
            default -> throw new IllegalStateException("短信模式无效，请检查 WEIRAN_SMS_MODE（允许值：disabled、local、aliyun）");
        };
    }

    @Bean
    @ConditionalOnMissingBean(FileStorage.class)
    @ConditionalOnProperty(prefix = "weiran.storage", name = "mode", havingValue = "disabled", matchIfMissing = true)
    public FileStorage systemDisabledFileStorage() {
        return new DisabledFileStorage();
    }

    @Bean
    @ConditionalOnMissingBean(FileStorage.class)
    @ConditionalOnProperty(prefix = "weiran.storage", name = "mode", havingValue = "local")
    public LocalFileStorage systemLocalFileStorage(final SystemStorageProperties properties) {
        return new LocalFileStorage(
                properties.local().root(), properties.local().urlPrefix());
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean(FileStorage.class)
    @ConditionalOnProperty(prefix = "weiran.storage", name = "mode", havingValue = "aliyun")
    public OssFileStorage systemAliyunFileStorage(final SystemStorageProperties properties) {
        final SystemStorageProperties.Aliyun aliyun = properties.aliyun();
        if (aliyun == null
                || aliyun.endpoint() == null
                || aliyun.bucket() == null
                || aliyun.accessKeyId() == null
                || aliyun.accessKeySecret() == null
                || aliyun.publicBaseUrl() == null
                || aliyun.endpoint().isBlank()
                || aliyun.bucket().isBlank()
                || aliyun.accessKeyId().isBlank()
                || aliyun.accessKeySecret().isBlank()
                || aliyun.publicBaseUrl().isBlank()) {
            throw new IllegalStateException("阿里云存储配置不完整，请检查 WEIRAN_STORAGE_ALIYUN_* 环境变量");
        }
        return new OssFileStorage(aliyun);
    }

    /**
     * 本地 JWT：同一个 Bean 既是签发端口 {@link TokenCodec}，也是本地签发方的 {@link TokenVerifier}
     * （只注册一次，免得分发器按类型收集时拿到同一实例的多个别名）。密钥不合法时启动失败。
     */
    @Bean
    @ConditionalOnMissingBean(TokenCodec.class)
    public JwtTokenCodec jwtTokenCodec(final AuthJwtProperties properties, final Clock clock) {
        return new JwtTokenCodec(properties, clock);
    }

    /** 读令牌签发方（不验签）。 */
    @Bean
    @ConditionalOnMissingBean
    public TokenIssuerReader tokenIssuerReader(final ObjectMapper objectMapper) {
        return new JwtIssuerReader(objectMapper);
    }

    /** 外部身份提供方注册表（配置不完整时启动失败）。 */
    @Bean
    @ConditionalOnMissingBean
    public ExternalIdentityProviders externalIdentityProviders(
            final AuthProvidersProperties properties, final ObjectMapper objectMapper, final Clock clock) {
        return new ConfiguredExternalIdentityProviders(properties, objectMapper, clock);
    }

    /** 外部登录流程状态签名（密钥由 JWT 密钥派生）。 */
    @Bean
    @ConditionalOnMissingBean
    public SsoStateSigner ssoStateSigner(final AuthJwtProperties properties, final ObjectMapper objectMapper) {
        return new HmacSsoStateSigner(properties.secret(), objectMapper);
    }

    /** BCrypt 密码哈希。 */
    @Bean
    @ConditionalOnMissingBean
    public PasswordHasher passwordHasher(final SystemSecurityProperties properties) {
        return new BCryptPasswordHasher(properties.bcryptStrength());
    }
}
