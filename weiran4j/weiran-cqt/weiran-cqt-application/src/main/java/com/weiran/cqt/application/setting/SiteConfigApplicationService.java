package com.weiran.cqt.application.setting;

import com.weiran.cqt.api.setting.SiteConfigService;
import com.weiran.cqt.domain.setting.SettingRepository;
import com.weiran.cqt.domain.setting.SiteConfig;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/** {@link SiteConfigService} 实现：读取编号 1–100 的配置项，交给领域规则组装。 */
public class SiteConfigApplicationService implements SiteConfigService {

    private final SettingRepository settingRepository;

    /** 构造服务。 */
    public SiteConfigApplicationService(final SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Override
    public Map<String, @Nullable Object> getConfig() {
        return SiteConfig.build(
                this.settingRepository.findContentsByIdentRange(SiteConfig.IDENT_FROM, SiteConfig.IDENT_TO));
    }
}
