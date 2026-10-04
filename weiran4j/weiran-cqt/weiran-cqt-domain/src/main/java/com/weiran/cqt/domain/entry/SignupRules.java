package com.weiran.cqt.domain.entry;

import com.weiran.common.error.BizException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** 报名规则：组别必须在配置内、报名号格式、重复参赛提示。 */
public final class SignupRules {

    private static final Map<String, String> SOURCE_LABELS = Map.of("zhongxi", "中戏", "qudao", "渠道", "houtai", "后台");

    private SignupRules() {}

    /**
     * 每位参赛人的组别都必须已选且属于该赛事、该赛项适用的组别。
     *
     * @param participants 参赛人
     * @param configuredGroups 已配置的组别名称
     */
    public static void requireConfiguredGroups(
            final List<Participant> participants, final Set<String> configuredGroups) {
        for (int i = 0; i < participants.size(); i++) {
            final Participant participant = participants.get(i);
            final String prefix = "第" + (i + 1) + "位成员“" + participant.name() + "”";
            if (participant.group().isEmpty()) {
                throw BizException.badRequest(prefix + "未选择组别");
            }
            if (!configuredGroups.contains(participant.group())) {
                throw BizException.badRequest(prefix + "的组别“" + participant.group() + "”未在后台当前赛事和赛项的组别配置中，请重新选择");
            }
        }
    }

    /** 报名号：{@code WEB-<赛事ID>-<10 位序号>}。 */
    public static String entryNo(final long competitionId, final long sequence) {
        return String.format(Locale.ROOT, "WEB-%d-%010d", competitionId, sequence);
    }

    /** 已参赛的提示（同原系统口径）。 */
    public static String conflictMessage(final int index, final String name, final ParticipationConflict conflict) {
        final String source =
                SignupRules.SOURCE_LABELS.getOrDefault(conflict.sourceDatabase(), conflict.sourceDatabase());
        return "第" + index + "位成员“" + name + "”已通过" + source + "身份参加本届同一赛项（报名号" + conflict.entryNo() + "，作品“"
                + conflict.title() + "”），请勿重复报名";
    }
}
