package com.weiran.system.api.auth;

import com.weiran.system.api.menu.MenuNode;
import java.util.List;
import org.jspecify.annotations.Nullable;

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

    /** 界面偏好的原始 JSON 对象文本；从未保存过返回 {@code null}。 */
    @Nullable
    String preferences(long userId);

    /**
     * 全量覆盖界面偏好。「必须是 JSON 对象」由调用方在解析请求体时保证。
     *
     * @param preferencesJson 序列化后的 JSON 对象文本
     * @throws com.weiran.common.error.BizException 超过 16KB（40000）
     */
    void updatePreferences(long userId, String preferencesJson);

    /** 收藏的菜单 ID，按收藏顺序；已删除、已禁用或当前已无权访问的菜单被过滤掉。 */
    List<Long> favoriteMenus(long userId);

    /**
     * 全量覆盖收藏菜单：去重后最多 50 个，每个都必须是当前用户可访问的菜单页面。
     *
     * @throws com.weiran.common.error.BizException 超过上限或包含不可访问的菜单（40000）
     */
    void updateFavoriteMenus(long userId, List<Long> menuIds);

    /**
     * 校验当前用户的密码（锁屏解锁用）。不签发令牌、不改令牌版本、不写登录日志。
     *
     * @throws com.weiran.common.error.BizException 密码错误（40101）
     */
    void verifyPassword(long userId, String password);
}
