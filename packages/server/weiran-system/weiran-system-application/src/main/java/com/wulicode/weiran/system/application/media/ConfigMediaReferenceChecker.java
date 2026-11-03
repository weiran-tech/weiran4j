package com.wulicode.weiran.system.application.media;

import com.wulicode.weiran.platform.domain.config.ConfigRepository;
import com.wulicode.weiran.system.api.media.MediaReferenceChecker;
import com.wulicode.weiran.system.api.media.MediaReferenceLocation;
import java.util.Collection;
import java.util.List;

/** 兼容配置旧数据及索引缺失时的实时引用检查。 */
public class ConfigMediaReferenceChecker implements MediaReferenceChecker {

    private final ConfigRepository configs;

    public ConfigMediaReferenceChecker(final ConfigRepository configs) {
        this.configs = configs;
    }

    @Override
    public List<MediaReferenceLocation> findReferences(final Collection<String> urls) {
        if (urls.isEmpty()) {
            return List.of();
        }
        return this.configs.findAll().stream()
                .flatMap(config -> urls.stream()
                        .filter(url -> config.getConfigValue().contains(url))
                        .map(url -> new MediaReferenceLocation(
                                url,
                                "system_config",
                                String.valueOf(config.getId()),
                                "config_value",
                                "系统配置：" + config.getConfigKey())))
                .toList();
    }
}
