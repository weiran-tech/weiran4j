package com.wulicode.weiran.system.api.user;

/** 文字头像：只包含展示文字和背景色，不接受图片地址。 */
public record UserAvatarView(String text, String background) {}
