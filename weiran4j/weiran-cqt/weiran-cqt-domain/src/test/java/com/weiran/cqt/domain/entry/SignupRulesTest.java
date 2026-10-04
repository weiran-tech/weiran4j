package com.weiran.cqt.domain.entry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.cqt.domain.account.CredentialType;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SignupRulesTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);

    private static final String ID_A = "130903200802260634";

    private static final String ID_B = "11010519491231002X";

    private static Map<String, Object> member(
            final String name, final String idCard, final String school, final String phone) {
        final Map<String, Object> member = new HashMap<>();
        member.put("name", name);
        member.put("idcard", idCard);
        member.put("school", school);
        member.put("phone", phone);
        member.put("group", "初中组");
        return member;
    }

    @Test
    @DisplayName("附件：ZIP 须本系统 .zip、名须 .zip；链接须 http(s) 且无汉字；必填与类型")
    void attachments() {
        final Attachment zip =
                Attachment.parse("文件", "https://cdn.x/a.ZIP?x=1", "", false, url -> url.startsWith("https://cdn.x/"));
        assertThat(zip.type()).isEqualTo(AttachmentType.ZIP);
        assertThat(zip.name()).isEqualTo("https://cdn.x/a.ZIP?x=1");
        assertThat(Attachment.parse("链接", "https://a.com/v", "作品", false, url -> false)
                        .type())
                .isEqualTo(AttachmentType.LINK);
        assertThat(Attachment.parse("ZIP", "", null, false, url -> true).url()).isNull();

        assertThatThrownBy(() -> Attachment.parse("pdf", "x", null, false, url -> true))
                .hasMessage("请选择附件类型：ZIP或链接");
        assertThatThrownBy(() -> Attachment.parse("ZIP", " ", null, true, url -> true))
                .hasMessage("当前赛项要求提交作品附件");
        assertThatThrownBy(() -> Attachment.parse("LINK", "ftp://a.com", null, false, url -> true))
                .hasMessage("链接附件必须是以http://或https://开头的完整网址");
        assertThatThrownBy(() -> Attachment.parse("LINK", "https://a.com/作品", null, false, url -> true))
                .hasMessage("链接附件不能包含汉字");
        assertThatThrownBy(() -> Attachment.parse("ZIP", "https://other.com/a.zip", null, false, url -> false))
                .hasMessage("ZIP附件必须选择并上传本系统中的.zip压缩包");
        assertThatThrownBy(() -> Attachment.parse("ZIP", "https://cdn.x/a.rar", null, false, url -> true))
                .hasMessage("ZIP附件必须选择并上传本系统中的.zip压缩包");
        assertThatThrownBy(() -> Attachment.parse("ZIP", "https://cdn.x/a.zip", "a.rar", false, url -> true))
                .hasMessage("ZIP附件文件名必须以.zip结尾");
    }

    @Test
    @DisplayName("团体成员：至少 2 人、证件重复、缺学校、手机号、证件格式；规范化")
    void teamMembers() {
        final List<Participant> team = TeamMembers.parse(
                List.of(
                        SignupRulesTest.member(" 张三 ", ID_A, "一中", "13800000000"),
                        SignupRulesTest.member("李四", ID_B.toLowerCase(java.util.Locale.ROOT), "二中", "")),
                SignupRulesTest.TODAY);
        assertThat(team).hasSize(2);
        assertThat(team.get(0).name()).isEqualTo("张三");
        assertThat(team.get(1).idCard()).isEqualTo(ID_B);
        assertThat(team.get(1).phone()).isNull();
        assertThat(team.get(0).credentialType()).isEqualTo(CredentialType.ID_CARD);

        assertThatThrownBy(() ->
                        TeamMembers.parse(List.of(SignupRulesTest.member("张三", ID_A, "一中", "")), SignupRulesTest.TODAY))
                .hasMessage("团体报名至少需要两名成员");
        assertThatThrownBy(() -> TeamMembers.parse(
                        List.of(
                                SignupRulesTest.member("张三", ID_A, "一中", ""),
                                SignupRulesTest.member("李四", ID_A, "二中", "")),
                        SignupRulesTest.TODAY))
                .hasMessage("第2位成员证件号重复");
        assertThatThrownBy(() -> TeamMembers.parse(
                        List.of(
                                SignupRulesTest.member("张三", ID_A, "一中", ""),
                                SignupRulesTest.member("李四", ID_B, " ", "")),
                        SignupRulesTest.TODAY))
                .hasMessage("第2位成员学校不能为空，每位成员必须填写自己的学校");
        assertThatThrownBy(() -> TeamMembers.parse(
                        List.of(
                                SignupRulesTest.member("张三", ID_A, "一中", "12345"),
                                SignupRulesTest.member("李四", ID_B, "二中", "")),
                        SignupRulesTest.TODAY))
                .hasMessage("第1位成员手机号格式不正确");
        assertThatThrownBy(() -> TeamMembers.parse(
                        List.of(
                                SignupRulesTest.member("张三", "123", "一中", ""),
                                SignupRulesTest.member("李四", ID_B, "二中", "")),
                        SignupRulesTest.TODAY))
                .hasMessage("第1位成员：身份证号必须是18位有效号码");
        assertThatThrownBy(() -> TeamMembers.parse(
                        List.of(
                                SignupRulesTest.member("", ID_A, "一中", ""),
                                SignupRulesTest.member("李四", ID_B, "二中", "")),
                        SignupRulesTest.TODAY))
                .hasMessage("第1位成员姓名不能为空");
    }

    @Test
    @DisplayName("组别必须已选且在配置内；报名号格式；冲突提示")
    void groupsNumbersConflicts() {
        final Participant p = new Participant("张三", CredentialType.ID_CARD, ID_A, null, "一中", null, "初中组");
        assertThatCode(() -> SignupRules.requireConfiguredGroups(List.of(p), Set.of("初中组")))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> SignupRules.requireConfiguredGroups(
                        List.of(new Participant("张三", CredentialType.ID_CARD, ID_A, null, "一中", null, "")),
                        Set.of("初中组")))
                .hasMessage("第1位成员“张三”未选择组别");
        assertThatThrownBy(() -> SignupRules.requireConfiguredGroups(
                        List.of(new Participant("张三", CredentialType.ID_CARD, ID_A, null, "一中", null, "大学组")),
                        Set.of("初中组")))
                .hasMessage("第1位成员“张三”的组别“大学组”未在后台当前赛事和赛项的组别配置中，请重新选择");

        assertThat(SignupRules.entryNo(2, 1)).isEqualTo("WEB-2-0000000001");
        assertThat(SignupRules.conflictMessage(1, "张三", new ParticipationConflict("qudao", "WEB-2-0000000009", "旧作品")))
                .isEqualTo("第1位成员“张三”已通过渠道身份参加本届同一赛项（报名号WEB-2-0000000009，作品“旧作品”），请勿重复报名");
        assertThat(EntryText.normalize("  ａ  b ")).isEqualTo("a b");
        assertThat(EntryText.normalize(null)).isEmpty();
    }

    @Test
    @DisplayName("详情进度文案与步骤")
    void progress() {
        assertThat(SignupRulesTest.detail(2).progressMessage()).isEqualTo("很遗憾，您的作品未能通过初审。");
        assertThat(SignupRulesTest.detail(3).progressMessage()).isEqualTo("恭喜您的作品顺利通过初审，请耐心等待复赛评审！");
        assertThat(SignupRulesTest.detail(1).progressMessage()).isEqualTo("您已报名成功，请等待作品初审！");
        assertThat(SignupRulesTest.detail(1).progressStep()).isEqualTo(1);
        assertThat(SignupRulesTest.detail(3).progressStep()).isEqualTo(2);
    }

    private static EntryDetailRow detail(final int legacyStatus) {
        return new EntryDetailRow(
                1L,
                "WEB-1-0000000001",
                1L,
                "赛事",
                "BOTH",
                1L,
                "一级",
                null,
                null,
                null,
                null,
                null,
                "作品",
                null,
                null,
                null,
                null,
                null,
                null,
                "初中组",
                false,
                "ACTIVE",
                legacyStatus,
                null,
                null);
    }
}
