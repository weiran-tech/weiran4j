package com.weiran.cqt.domain.entry;

import com.weiran.cqt.domain.account.CredentialType;
import com.weiran.cqt.domain.account.Credentials;
import com.weiran.framework.error.BizException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** 团体报名成员规则（口径沿用原系统 {@code signup}）。 */
public final class TeamMembers {

    /** 团体最少人数。 */
    static final int MIN_MEMBERS = 2;

    private static final Pattern MOBILE = Pattern.compile("1[3-9]\\d{9}");

    private TeamMembers() {}

    /**
     * 校验并规范化成员；提示语带「第 N 位成员」。
     *
     * @param members 成员表单（键：name、idcard、credential_type、phone、school、sex、group / zubie）
     * @param today 今天（身份证出生日期校验）
     */
    public static List<Participant> parse(final List<? extends Map<String, ?>> members, final LocalDate today) {
        if (members.size() < TeamMembers.MIN_MEMBERS) {
            throw BizException.badRequest("团体报名至少需要两名成员");
        }
        final List<Participant> result = new ArrayList<>();
        final Set<String> seen = new HashSet<>();
        for (int i = 0; i < members.size(); i++) {
            final Map<String, ?> member = members.get(i);
            final int index = i + 1;
            final String name = EntryText.normalize(member.get("name"));
            final String phone = EntryText.normalize(member.get("phone"));
            final String school = EntryText.normalize(member.get("school"));
            final CredentialType type;
            final String idCard;
            try {
                final Object rawType = member.get("credential_type");
                type = CredentialType.parse(rawType == null ? "身份证号" : String.valueOf(rawType));
                final Object rawCard = member.get("idcard");
                idCard = Credentials.requireValid(type, rawCard == null ? null : String.valueOf(rawCard), today);
            } catch (final BizException ex) {
                throw BizException.badRequest("第" + index + "位成员：" + ex.getMessage());
            }
            if (name.isEmpty()) {
                throw BizException.badRequest("第" + index + "位成员姓名不能为空");
            }
            if (school.isEmpty()) {
                throw BizException.badRequest("第" + index + "位成员学校不能为空，每位成员必须填写自己的学校");
            }
            if (!phone.isEmpty() && !TeamMembers.MOBILE.matcher(phone).matches()) {
                throw BizException.badRequest("第" + index + "位成员手机号格式不正确");
            }
            if (!seen.add(type.name() + ":" + idCard)) {
                throw BizException.badRequest("第" + index + "位成员证件号重复");
            }
            final Object group = member.get("group") != null ? member.get("group") : member.get("zubie");
            result.add(new Participant(
                    name,
                    type,
                    idCard,
                    phone.isEmpty() ? null : phone,
                    school,
                    TeamMembers.sex(member.get("sex")),
                    EntryText.normalize(group)));
        }
        return result;
    }

    private static @Nullable Integer sex(final @Nullable Object raw) {
        final String text = EntryText.normalize(raw);
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(text);
        } catch (final NumberFormatException ex) {
            return null;
        }
    }
}
