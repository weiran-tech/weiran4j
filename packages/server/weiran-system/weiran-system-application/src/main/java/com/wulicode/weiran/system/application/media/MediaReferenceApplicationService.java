package com.wulicode.weiran.system.application.media;

import com.wulicode.weiran.system.api.media.MediaReferenceService;
import com.wulicode.weiran.system.domain.media.MediaReferenceRepository;
import java.util.Collection;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** 业务模块在保存来源记录的同一事务中登记资源引用。 */
public class MediaReferenceApplicationService implements MediaReferenceService {

    private final MediaReferenceRepository references;

    public MediaReferenceApplicationService(final MediaReferenceRepository references) {
        this.references = references;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void replace(
            final String sourceType,
            final String sourceId,
            final String field,
            final String label,
            final Collection<String> urls) {
        if (sourceType.isBlank() || sourceId.isBlank() || field.isBlank() || label.isBlank()) {
            throw new IllegalArgumentException("资源引用来源和显示位置不能为空");
        }
        this.references.replace(sourceType, sourceId, field, label, urls);
    }
}
