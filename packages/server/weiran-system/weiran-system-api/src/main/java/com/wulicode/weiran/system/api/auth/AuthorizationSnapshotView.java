package com.wulicode.weiran.system.api.auth;

import com.wulicode.weiran.system.api.menu.MenuNode;
import java.util.List;

/** 同一数据库视图生成的身份及菜单；revision 使用字符串避免 JS 精度损失。 */
public record AuthorizationSnapshotView(CurrentUserView user, List<MenuNode> menus, String revision) {}
