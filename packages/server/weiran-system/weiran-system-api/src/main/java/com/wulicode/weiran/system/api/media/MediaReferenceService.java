package com.wulicode.weiran.system.api.media;

import java.util.Collection;

/** 与业务写入处于同一事务的资源引用登记入口。 */
public interface MediaReferenceService {

    /** 全量替换一个来源字段的资源 URL；空集合表示清除引用。 */
    void replace(String sourceType, String sourceId, String field, String label, Collection<String> urls);
}
