package com.wulicode.weiran.system.application.media;

import com.wulicode.weiran.system.domain.media.MediaRepository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** 数据库提交后的媒体记录清理，使用独立事务保证删除提交。 */
public class MediaAssetDeletionService {

    private final MediaRepository mediaRepository;

    public MediaAssetDeletionService(final MediaRepository mediaRepository) {
        this.mediaRepository = mediaRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteRecord(final long id) {
        this.mediaRepository.deleteById(id);
    }
}
