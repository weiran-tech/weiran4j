package com.weiran.system.api.auth;

import com.weiran.system.api.menu.MenuNode;
import java.util.List;

/** 认证服务。 */
public interface AuthService {

    /**
     * 用户名密码登录；成功与失败都会写登录日志。
     *
     * @throws com.weiran.common.error.BizException 用户名或密码错误（40101）、账号已禁用（40301）
     */
    LoginResult login(LoginCommand command, ClientContext client);

    /** 登出：只写登出日志（JWT 无状态，前端丢弃令牌即可）。 */
    void logout(long userId, ClientContext client);

    /** 当前用户信息。 */
    CurrentUserView me(long userId);

    /** 当前用户可见的菜单树（只含目录与菜单）。 */
    List<MenuNode> menus(long userId);

    /** 修改个人资料。 */
    void updateProfile(long userId, UpdateProfileCommand command);

    /** 修改自己的密码；成功后令牌版本加一，旧令牌全部失效。 */
    void changePassword(long userId, ChangePasswordCommand command);
}
