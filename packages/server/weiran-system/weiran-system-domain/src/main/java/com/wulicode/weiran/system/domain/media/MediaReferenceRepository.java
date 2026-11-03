package com.wulicode.weiran.system.domain.media;

import java.util.Collection;
import java.util.List;

/** 资源引用登记与删除状态的持久化端口。 */
public interface MediaReferenceRepository {

    void replace(String sourceType, String sourceId, String field, String label, Collection<String> urls);

    List<MediaReference> findReferences(Collection<String> urls);

    /** 从自由文本配置中找出已登记资源的 URL。 */
    List<String> findUrlsInText(String text);

    /** 锁住资源并在没有登记引用时标记为删除中；已有引用时返回 false。 */
    boolean claimDeletion(long mediaId);
}
