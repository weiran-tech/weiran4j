package com.weiran.cqt.application.region;

import com.weiran.cqt.api.region.RegionService;
import com.weiran.cqt.api.region.RegionView;
import com.weiran.cqt.domain.region.RegionRepository;
import java.util.List;

/** {@link RegionService} 实现。 */
public class RegionApplicationService implements RegionService {

    private final RegionRepository regionRepository;

    /** 构造服务。 */
    public RegionApplicationService(final RegionRepository regionRepository) {
        this.regionRepository = regionRepository;
    }

    @Override
    public List<RegionView> list() {
        return this.regionRepository.findAll().stream()
                .map(region -> new RegionView(region.legacyId(), region.parentLegacyId(), region.name(), region.code()))
                .toList();
    }
}
