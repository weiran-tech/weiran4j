package com.wulicode.weiran.system.domain.menu;

/** 菜单结构事务的共享串行化边界。 */
public interface MenuStructureGuard {
    /** 在当前事务内取得守卫，必须先于任何菜单读取。 */
    void acquire();
}
