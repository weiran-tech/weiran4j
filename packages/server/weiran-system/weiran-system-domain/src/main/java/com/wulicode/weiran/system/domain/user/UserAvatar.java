package com.wulicode.weiran.system.domain.user;

import com.wulicode.weiran.framework.error.BizException;

/** 文字头像；持久化为 sys_user.avatar JSON。 */
public record UserAvatar(String text, String background) {

    public UserAvatar {
        if (text == null
                || text.isBlank()
                || text.length() > 8
                || text.codePointCount(0, text.length()) > 4
                || text.codePoints().anyMatch(Character::isISOControl)) {
            throw BizException.badRequest("avatar.text: 请输入最多 4 个文字");
        }
        if (background == null || !background.matches("#[0-9A-Fa-f]{6}")) {
            throw BizException.badRequest("avatar.background: 必须是 #RRGGBB 颜色");
        }
    }
}
