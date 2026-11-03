package com.wulicode.weiran.platform.application.config;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.text.Texts;
import com.wulicode.weiran.platform.api.config.ConfigGroupView;
import com.wulicode.weiran.platform.api.config.ConfigService;
import com.wulicode.weiran.platform.api.config.ConfigView;
import com.wulicode.weiran.platform.api.config.CreateConfigGroupCommand;
import com.wulicode.weiran.platform.api.config.PublicConfigView;
import com.wulicode.weiran.platform.api.config.SaveConfigCommand;
import com.wulicode.weiran.platform.api.config.UpdateConfigGroupCommand;
import com.wulicode.weiran.platform.domain.config.ConfigGroup;
import com.wulicode.weiran.platform.domain.config.ConfigGroupRepository;
import com.wulicode.weiran.platform.domain.config.ConfigRepository;
import com.wulicode.weiran.platform.domain.config.ConfigType;
import com.wulicode.weiran.platform.domain.config.JsonSyntax;
import com.wulicode.weiran.platform.domain.config.SystemConfig;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 系统配置用例。 */
public class ConfigApplicationService implements ConfigService {

    private static final String INTERNAL_SECURITY_GROUP = "security";

    private final ConfigRepository configRepository;

    private final ConfigGroupRepository configGroupRepository;

    private final JsonSyntax jsonSyntax;

    /** 构造服务。 */
    public ConfigApplicationService(
            final ConfigRepository configRepository,
            final ConfigGroupRepository configGroupRepository,
            final JsonSyntax jsonSyntax) {
        this.configRepository = configRepository;
        this.configGroupRepository = configGroupRepository;
        this.jsonSyntax = jsonSyntax;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<ConfigView> page(final @Nullable String keyword, final PageQuery pageQuery) {
        return this.configRepository.page(Texts.trimToNull(keyword), pageQuery).map(ConfigApplicationService::toView);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConfigView> all() {
        return this.configRepository.findAll().stream()
                .map(ConfigApplicationService::toView)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConfigGroupView> groups() {
        return this.configGroupRepository.findEnabled().stream()
                .filter(item -> !ConfigApplicationService.INTERNAL_SECURITY_GROUP.equals(item.key())
                        || !"config_system".equals(item.groupKey()))
                .map(item -> new ConfigGroupView(
                        item.groupKey(),
                        item.key(),
                        item.label(),
                        item.builtin(),
                        !item.builtin()
                                && !this.configRepository.existsByGroupKey(
                                        item.key(), item.groupKey().equals("config_sms") ? "sms." : "system."),
                        item.createdAt()))
                .toList();
    }

    @Override
    @Transactional
    public long createGroup(final CreateConfigGroupCommand command) {
        final String groupDomain = ConfigApplicationService.requireGroupDomain(command.groupKey());
        final String key = command.key().strip();
        final String label = command.label().strip();
        ConfigApplicationService.rejectInternalGroup(groupDomain, key);
        if (key.isEmpty() || !key.matches("[a-z][a-z0-9_-]*")) {
            throw BizException.badRequest("分组编码必须以小写字母开头，且只能包含小写字母、数字、下划线和连字符");
        }
        if (label.isEmpty()) {
            throw BizException.badRequest("分组名称不能为空");
        }
        if (this.configGroupRepository.existsByKey(groupDomain, key)) {
            throw BizException.duplicate("配置分组编码已存在");
        }
        final int sort = (int) this.configGroupRepository.findEnabled().stream()
                        .filter(group -> group.groupKey().equals(groupDomain))
                        .count()
                + 1;
        return this.configGroupRepository.save(new ConfigGroup(groupDomain, key, label, sort, false, null));
    }

    @Override
    @Transactional
    public void updateGroup(final UpdateConfigGroupCommand command) {
        final String groupDomain = ConfigApplicationService.requireGroupDomain(command.groupKey());
        final String key = command.key().strip();
        final String label = command.label().strip();
        ConfigApplicationService.rejectInternalGroup(groupDomain, key);
        if (label.isEmpty()) {
            throw BizException.badRequest("分组名称不能为空");
        }
        if (this.configGroupRepository.findEnabledByKey(groupDomain, key).isEmpty()) {
            throw new BizException(CommonErrors.NOT_FOUND, "配置分组不存在");
        }
        if (!this.configGroupRepository.updateLabel(groupDomain, key, label)) {
            throw new BizException(CommonErrors.NOT_FOUND, "配置分组不存在");
        }
    }

    @Override
    @Transactional
    public void deleteGroup(final String groupKey, final String code) {
        final String groupDomain = ConfigApplicationService.requireGroupDomain(groupKey);
        final String key = code.strip();
        ConfigApplicationService.rejectInternalGroup(groupDomain, key);
        final ConfigGroup group = this.configGroupRepository
                .findEnabledByKey(groupDomain, key)
                .orElseThrow(() -> BizException.notFound("配置分组不存在"));
        if (group.builtin()) {
            throw BizException.conflict("内置配置分组不可删除");
        }
        if (this.configRepository.existsByGroupKey(key, groupDomain.equals("config_sms") ? "sms." : "system.")) {
            throw BizException.conflict("分组下仍有配置项，不能删除");
        }
        if (!this.configGroupRepository.deleteByKey(groupDomain, key)) {
            throw BizException.notFound("配置分组不存在");
        }
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
        SystemConfig.requireKeyConvention(key, command.groupKey().strip());
        this.requireConfigGroup(key, command.groupKey().strip());
        if (this.configRepository.existsByKey(key)) {
            throw BizException.duplicate("配置键已存在");
        }
        final SystemConfig config = SystemConfig.builder()
                .configKey(key)
                .configValue(command.configValue())
                .configType(ConfigType.of(command.configType()))
                .groupKey(command.groupKey().strip())
                .fieldType(command.fieldType())
                .fieldOptions(Texts.trimToNull(command.fieldOptions()))
                .required(command.required())
                .description(Texts.trimToNull(command.description()))
                .builtin(false)
                .build()
                .validated(this.jsonSyntax);
        return this.configRepository.save(config);
    }

    @Override
    @Transactional
    public long createBusiness(final String namespace, final SaveConfigCommand command) {
        final String key = command.configKey();
        ConfigApplicationService.requireBusinessKey(namespace, key);
        if (command.configValue() == null) {
            throw BizException.badRequest("configValue: 不能为空");
        }
        final String groupKey = command.groupKey();
        if (this.configGroupRepository
                .findEnabledByKey("config_system", groupKey)
                .isEmpty()) {
            throw BizException.badRequest("配置分组不存在或未启用");
        }
        if (this.configRepository.existsByKey(key)) {
            throw BizException.duplicate("配置键已存在");
        }
        final SystemConfig config = SystemConfig.builder()
                .configKey(key)
                .configValue(command.configValue())
                .configType(ConfigType.of(command.configType()))
                .groupKey(groupKey)
                .fieldType(command.fieldType())
                .fieldOptions(Texts.trimToNull(command.fieldOptions()))
                .required(command.required())
                .description(Texts.trimToNull(command.description()))
                .builtin(false)
                .build()
                .validatedBusiness(this.jsonSyntax);
        return this.configRepository.save(config);
    }

    @Override
    @Transactional
    public void update(final long id, final SaveConfigCommand command) {
        final SystemConfig config = this.requireConfig(id);
        final String key = command.configKey().strip();
        this.requireConfigGroup(key, command.groupKey().strip());
        final SystemConfig updated = config.withDetails(
                key,
                command.configValue(),
                ConfigType.of(command.configType()),
                command.groupKey().strip(),
                command.fieldType(),
                Texts.trimToNull(command.fieldOptions()),
                command.required(),
                Texts.trimToNull(command.description()),
                this.jsonSyntax);
        if (!config.getConfigKey().equals(key)
                || !config.getGroupKey().equals(command.groupKey().strip())) {
            SystemConfig.requireKeyConvention(key, command.groupKey().strip());
        }
        if (!config.getConfigKey().equals(key) && this.configRepository.existsByKey(key)) {
            throw BizException.duplicate("配置键已存在");
        }
        this.configRepository.save(updated);
    }

    @Override
    @Transactional
    public void updateBusinessValue(
            final String namespace, final String configKey, final @Nullable String configValue) {
        ConfigApplicationService.requireBusinessKey(namespace, configKey);
        if (configValue == null) {
            throw BizException.badRequest("configValue: 不能为空");
        }
        // MySQL 的默认排序规则不区分大小写；锁定后仍须核对真实键。
        final SystemConfig config = this.configRepository
                .findByKeyForUpdate(configKey)
                .filter(found -> found.getConfigKey().equals(configKey))
                .orElseThrow(() -> BizException.notFound("配置不存在"));
        final SystemConfig updated = config.withValue(configValue, this.jsonSyntax);
        if (!this.configRepository.updateValue(updated.requireId(), configKey, updated.getConfigValue())) {
            throw BizException.notFound("配置不存在");
        }
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
        // 库的排序规则大小写不敏感，查回来的键可能与请求的大小写不同：以库里的真实键再判一次。
        final SystemConfig config = this.configRepository
                .findByKey(configKey)
                .filter(found -> SystemConfig.isPublicKey(found.getConfigKey()))
                .orElseThrow(() -> BizException.notFound("配置不存在"));
        return new PublicConfigView(config.getConfigKey(), config.getConfigValue());
    }

    private SystemConfig requireConfig(final long id) {
        return this.configRepository
                .findById(id)
                .filter(config -> !ConfigApplicationService.INTERNAL_SECURITY_GROUP.equals(config.getGroupKey()))
                .orElseThrow(() -> BizException.notFound("配置不存在"));
    }

    private void requireConfigGroup(final String configKey, final String groupKey) {
        final String groupDomain = configKey.startsWith("sms.") ? "config_sms" : "config_system";
        ConfigApplicationService.rejectInternalGroup(groupDomain, groupKey);
        if (this.configGroupRepository.findEnabledByKey(groupDomain, groupKey).isEmpty()) {
            throw BizException.badRequest("配置分组不存在或未启用");
        }
    }

    private static String requireGroupDomain(final String groupKey) {
        if (!groupKey.equals("config_system") && !groupKey.equals("config_sms")) {
            throw BizException.badRequest("配置域无效");
        }
        return groupKey;
    }

    private static void rejectInternalGroup(final String groupDomain, final String key) {
        if ("config_system".equals(groupDomain) && ConfigApplicationService.INTERNAL_SECURITY_GROUP.equals(key)) {
            throw BizException.badRequest("安全设置分组不对外开放");
        }
    }

    private static void requireBusinessKey(final String namespace, final String configKey) {
        if (namespace == null
                || !namespace.matches("[a-z][a-z0-9_-]*")
                || "system".equals(namespace)
                || "sms".equals(namespace)
                || configKey == null
                || !configKey.matches(namespace + "\\.[a-z][a-z0-9_-]*\\.[a-z][a-z0-9_-]*")
                || configKey.length() > 128) {
            throw BizException.badRequest("配置键须为业务命名空间下的三级小写键，最多 128 字符");
        }
    }

    private static ConfigView toView(final SystemConfig config) {
        return new ConfigView(
                config.requireId(),
                config.getConfigKey(),
                config.getConfigValue(),
                config.getConfigType().value(),
                config.getGroupKey(),
                config.getFieldType(),
                config.getFieldOptions(),
                config.isRequired(),
                config.getDescription(),
                config.isBuiltin(),
                config.getCreatedAt(),
                config.getUpdatedAt());
    }
}
