package com.wulicode.weiran.system.api.media;

import java.util.Collection;
import java.util.List;

/** 引用来源检查器；业务模块可注册 Bean，资源列表与删除会调用所有实现。 */
public interface MediaReferenceChecker {

    /** 批量检查这些资源 URL，失败时抛异常以阻止删除。 */
    List<MediaReferenceLocation> findReferences(Collection<String> urls);
}
