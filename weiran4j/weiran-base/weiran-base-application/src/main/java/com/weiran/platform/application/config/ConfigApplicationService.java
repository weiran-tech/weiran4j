package com.weiran.platform.application.config;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.text.Texts;
import com.weiran.platform.api.config.ConfigService;
import com.weiran.platform.api.config.ConfigView;
import com.weiran.platform.api.config.PublicConfigView;
import com.weiran.platform.api.config.SaveConfigCommand;
import com.weiran.platform.domain.config.ConfigRepository;
import com.weiran.platform.domain.config.ConfigType;
import com.weiran.platform.domain.config.JsonSyntax;
import com.weiran.platform.domain.config.SystemConfig;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 系统配置用例。 */
public class ConfigApplicationService implements ConfigService {

    private final ConfigRepository configRepository;

    private final JsonSyntax jsonSyntax;

    /** 构造服务。 */
    public ConfigApplicationService(final ConfigRepository configRepository, final JsonSyntax jsonSyntax) {
        this.configRepository = configRepository;
        this.jsonSyntax = jsonSyntax;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<ConfigView> page(final @Nullable String keyword, final PageQuery pageQuery) {
        return this.configRepository.page(Texts.trimToNull(keyword), pageQuery).map(ConfigApplicationService::toView);
    }

    @Override
    @Transactional(readOnly = true)
    public ConfigView get(final long id) {
        return ConfigApplicationService.toView(this.requireConfig(id));
    }

    @Override
    @Transactional
    public long create(final SaveConfigCommand command) {
        final String key = command.configKey().strip();
        if (this.configRepository.existsByKey(key)) {
            throw BizException.duplicate("配置键已存在");
        }
        final SystemConfig config = SystemConfig.builder()
                .configKey(key)
                .configValue(command.configValue())
                .configType(ConfigType.of(command.configType()))
                .description(Texts.trimToNull(command.description()))
                .builtin(false)
                .build()
                .validated(this.jsonSyntax);
        return this.configRepository.save(config);
    }

    @Override
    @Transactional
    public void update(final long id, final SaveConfigCommand command) {
        final SystemConfig config = this.requireConfig(id);
        final String key = command.configKey().strip();
        final SystemConfig updated = config.withDetails(
                key,
                command.configValue(),
                ConfigType.of(command.configType()),
                Texts.trimToNull(command.description()),
                this.jsonSyntax);
        if (!config.getConfigKey().equals(key) && this.configRepository.existsByKey(key)) {
            throw BizException.duplicate("配置键已存在");
        }
        this.configRepository.save(updated);
    }

    @Override
    @Transactional
    public void delete(final long id) {
        this.requireConfig(id).ensureDeletable();
        this.configRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PublicConfigView getPublic(final String configKey) {
        if (!SystemConfig.isPublicKey(configKey)) {
            throw new BizException(CommonErrors.FORBIDDEN, "该配置不允许公开读取");
        }
        // 库的排序规则大小写不敏感，查回来的键可能与请求的大小写不同：以库里的真实键再判一次前缀。
        final SystemConfig config = this.configRepository
                .findByKey(configKey)
                .filter(found -> SystemConfig.isPublicKey(found.getConfigKey()))
                .orElseThrow(() -> BizException.notFound("配置不存在"));
        return new PublicConfigView(config.getConfigKey(), config.getConfigValue());
    }

    private SystemConfig requireConfig(final long id) {
        return this.configRepository.findById(id).orElseThrow(() -> BizException.notFound("配置不存在"));
    }

    private static ConfigView toView(final SystemConfig config) {
        return new ConfigView(
                config.requireId(),
                config.getConfigKey(),
                config.getConfigValue(),
                config.getConfigType().value(),
                config.getDescription(),
                config.isBuiltin(),
                config.getCreatedAt(),
                config.getUpdatedAt());
    }
}
