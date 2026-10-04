package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/** 赛事配置读取与前台报名（个人 / 团体、阶段与重复、列表与详情）。 */
class CqtSignupIT extends CqtIntegrationTestSupport {

    /** 已结束的历史赛事。 */
    private static final long PAST = 9101;

    /** 启用中、省国赛共用。 */
    private static final long SHARED = 9102;

    /** 启用中、省国赛分别报名。 */
    private static final long SEPARATE = 9103;

    /** 停用草稿。 */
    private static final long DRAFT = 9104;

    @BeforeEach
    void seed() {
        this.jdbc.update(
                "INSERT IGNORE INTO cqt_competitions (id, legacy_id, name, edition, year, status, national_entry_mode)"
                        + " VALUES (?, 2026, '首届', '1', 2026, 2, 'SHARED'), (?, 2027, '第二届', '2', 2027, 1, 'SHARED'),"
                        + " (?, 2028, '第三届', '3', 2028, 1, 'SEPARATE'), (?, 2029, '第四届', '4', 2029, 0, 'SHARED')",
                PAST,
                SHARED,
                SEPARATE,
                DRAFT);
        this.jdbc.update(
                "INSERT IGNORE INTO cqt_competition_categories (legacy_id, parent_legacy_id, name, sort_order, status,"
                        + " attachment_required) VALUES (9001, 0, '戏剧表演', 1, 1, 0), (9002, 0, '剧本创作', 2, 1, 1),"
                        + " (9011, 9001, '话剧', 1, 1, 0), (9012, 9001, '停用专业', 2, 0, 0), (9021, 9002, '短剧', 1, 1, 0)");
        for (final long competition : List.of(SHARED, SEPARATE, DRAFT)) {
            this.jdbc.update(
                    "INSERT IGNORE INTO cqt_competition_groups (competition_id, first_category_legacy_id,"
                            + " second_category_legacy_id, name, status) VALUES (?, 0, 0, '初中组', 1), (?, 9002, 0, '专业组', 1)",
                    competition,
                    competition);
        }
    }

    /** 注册一个个人账号（指定证件号），返回登录令牌。 */
    private String accountWithIdCard(final String idCard) {
        final String phone = CqtIntegrationTestSupport.uniquePhone();
        CqtSignupIT.assertPortalOk(this.post(
                "/api-web/auth/register",
                null,
                CqtIntegrationTestSupport.personalForm(phone, idCard, this.smsCode(phone))));
        return this.portalToken(phone, CqtIntegrationTestSupport.PASSWORD);
    }

    private static Map<String, Object> form(final long competition, final long first, final Object second) {
        final Map<String, Object> form = new HashMap<>();
        form.put("title", "作品" + System.nanoTime());
        form.put("competitionid", competition);
        form.put("firstcatid", first);
        form.put("secaodcatid", second);
        form.put("zubie", "初中组");
        form.put("istuandui", 0);
        form.put("attachment_type", "ZIP");
        form.put("purl", "/uploads/cqt/user_files/1/202610/abc.zip");
        form.put("purlname", "作品.zip");
        form.put("teachername", "王老师");
        return form;
    }

    private ResponseEntity<JsonNode> signup(final @Nullable String token, final Map<String, Object> form) {
        return this.post("/api-web/competition/signup", token, form);
    }

    @Test
    @DisplayName("赛事列表与过滤；停用赛事无可报赛项；二级赛项只含启用的；组别按赛项适用")
    void readsCompetitionConfig() {
        final List<Long> ids = new ArrayList<>();
        IntegrationTestSupport.data(this.get("/api-web/competcategory/competitionlists", null))
                .forEach(node -> ids.add(node.path("id").asLong()));
        assertThat(ids).containsSubsequence(DRAFT, SEPARATE, SHARED, PAST);
        final JsonNode enabled =
                IntegrationTestSupport.data(this.get("/api-web/competcategory/competitionlists?status=1", null));
        enabled.forEach(node -> assertThat(node.path("status").asInt()).isEqualTo(1));
        assertThat(enabled.get(0).has("legacy_id")).isTrue();

        assertThat(IntegrationTestSupport.data(this.get("/api-web/auth/getsecondcat?id=" + DRAFT, null))
                        .size())
                .isZero();
        final List<Long> firsts = new ArrayList<>();
        IntegrationTestSupport.data(this.get("/api-web/auth/getsecondcat?id=" + SHARED, null))
                .forEach(node -> firsts.add(node.path("id").asLong()));
        assertThat(firsts).contains(9001L, 9002L);

        final JsonNode seconds =
                IntegrationTestSupport.data(this.get("/api-web/competcategory/secondcategory?id=9001", null));
        assertThat(seconds.size()).isEqualTo(1);
        assertThat(seconds.get(0).path("id").asLong()).isEqualTo(9011L);
        assertThat(seconds.get(0).path("pid").asLong()).isEqualTo(9001L);
        assertThat(seconds.get(0).has("fujian")).isTrue();

        final List<String> groups1 = new ArrayList<>();
        IntegrationTestSupport.data(this.get(
                        "/api-web/competcategory/groups?competition_id=" + SHARED + "&firstcatid=9001&secondcatid=0",
                        null))
                .forEach(node -> groups1.add(node.path("name").asText()));
        assertThat(groups1).containsExactly("初中组");
        final List<String> groups2 = new ArrayList<>();
        IntegrationTestSupport.data(this.get(
                        "/api-web/competcategory/groups?competition_id=" + SHARED + "&firstcatid=9002&secondcatid=0",
                        null))
                .forEach(node -> groups2.add(node.path("name").asText()));
        assertThat(groups2).containsExactly("初中组", "专业组");
        assertThat(IntegrationTestSupport.data(
                                this.get("/api-web/competcategory/groups?competition_id=" + SHARED, null))
                        .size())
                .isZero();
    }

    @Test
    @DisplayName("个人报名：写入作品 / 人员 / 参赛人 / 唯一键 / 评审对象；列表与详情；重复 409；他人详情 403")
    void personalSignup() {
        final String token = this.accountWithIdCard(CqtIntegrationTestSupport.uniqueIdCard());
        final Map<String, Object> form = CqtSignupIT.form(SHARED, 9001, 9011);
        final ResponseEntity<JsonNode> response = this.signup(token, form);
        CqtSignupIT.assertPortalOk(response);
        final long entryId =
                IntegrationTestSupport.data(response).path("productid").asLong();
        final String entryNo =
                IntegrationTestSupport.data(response).path("entry_no").asText();
        assertThat(entryNo).matches("WEB-" + SHARED + "-\\d{10}");

        final Map<String, Object> entry = this.jdbc.queryForMap(
                "SELECT entry_type, status, legacy_status, stage_scope, declared_group_size, attachment_type, group_name"
                        + " FROM cqt_entries WHERE id = ?",
                entryId);
        assertThat(entry)
                .containsEntry("entry_type", "INDIVIDUAL")
                .containsEntry("status", "ACTIVE")
                .containsEntry("stage_scope", "BOTH")
                .containsEntry("attachment_type", "ZIP")
                .containsEntry("group_name", "初中组");
        assertThat(this.count("cqt_entry_participants", entryId)).isEqualTo(1);
        assertThat(this.count("cqt_competition_participation_keys", entryId)).isEqualTo(1);
        assertThat(this.count("cqt_evaluation_targets", entryId)).isEqualTo(1);

        final JsonNode list = IntegrationTestSupport.data(this.get("/api-web/competcategory/productlists", token));
        assertThat(list.path("total").asInt()).isEqualTo(1);
        assertThat(list.path("data").get(0).path("productid").asLong()).isEqualTo(entryId);
        assertThat(list.path("data").get(0).path("teantype").asInt()).isZero();

        final JsonNode detail =
                IntegrationTestSupport.data(this.get("/api-web/competition/signupdetail?productid=" + entryId, token));
        assertThat(detail.path("msg").asText()).isEqualTo("您已报名成功，请等待作品初审！");
        assertThat(detail.path("step").asInt()).isEqualTo(1);
        assertThat(detail.path("shengAward").isNull()).isTrue();
        assertThat(detail.path("team").size()).isEqualTo(1);
        assertThat(detail.path("productinfo").path("firstcatid_name").asText()).isEqualTo("戏剧表演");
        assertThat(detail.path("productinfo").path("secondcatid_name").asText()).isEqualTo("话剧");
        assertThat(detail.path("productinfo").path("zubie").asText()).isEqualTo("初中组");

        final ResponseEntity<JsonNode> duplicate = this.signup(token, CqtSignupIT.form(SHARED, 9001, 0));
        assertThat(IntegrationTestSupport.body(duplicate).path("code").asInt()).isEqualTo(409);
        assertThat(IntegrationTestSupport.body(duplicate).path("message").asText())
                .contains(entryNo);

        final String other = this.accountWithIdCard(CqtIntegrationTestSupport.uniqueIdCard());
        CqtSignupIT.assertPortalError(
                this.get("/api-web/competition/signupdetail?productid=" + entryId, other), 403, "无权查看该报名记录");
    }

    @Test
    @DisplayName("团体报名：3 人、仅第一位为队长；成员不足 400")
    void teamSignup() {
        final String token = this.accountWithIdCard(CqtIntegrationTestSupport.uniqueIdCard());
        final Map<String, Object> form = CqtSignupIT.form(SHARED, 9001, 0);
        form.put("istuandui", "1");
        final List<Map<String, Object>> members = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            members.add(Map.of(
                    "name",
                    "成员" + i,
                    "idcard",
                    CqtIntegrationTestSupport.uniqueIdCard(),
                    "credential_type",
                    "身份证号",
                    "school",
                    "学校" + i,
                    "phone",
                    "",
                    "group",
                    "初中组"));
        }
        form.put("team_members", members);
        final ResponseEntity<JsonNode> response = this.signup(token, form);
        CqtSignupIT.assertPortalOk(response);
        final long entryId =
                IntegrationTestSupport.data(response).path("productid").asLong();
        assertThat(this.jdbc.queryForObject(
                        "SELECT CONCAT(entry_type, '/', declared_group_size) FROM cqt_entries WHERE id = ?",
                        String.class,
                        entryId))
                .isEqualTo("TEAM/3");
        assertThat(this.jdbc.queryForObject(
                        "SELECT GROUP_CONCAT(is_leader ORDER BY sort_order) FROM cqt_entry_participants WHERE entry_id = ?",
                        String.class,
                        entryId))
                .isEqualTo("1,0,0");
        assertThat(this.count("cqt_competition_participation_keys", entryId)).isEqualTo(3);

        final Map<String, Object> single = CqtSignupIT.form(SHARED, 9002, 0);
        single.put("istuandui", "1");
        single.put("team_members", "[{\"name\":\"甲\"}]");
        CqtSignupIT.assertPortalError(this.signup(token, single), 400, "团体报名至少需要两名成员");
    }

    @Test
    @DisplayName("省国赛分别报名：已有国赛记录可报省赛，已有 BOTH 记录不可")
    void separateStages() {
        final String nationalId = CqtIntegrationTestSupport.uniqueIdCard();
        final String bothId = CqtIntegrationTestSupport.uniqueIdCard();
        final String nationalToken = this.accountWithIdCard(nationalId);
        final String bothToken = this.accountWithIdCard(bothId);
        this.jdbc.update(
                "INSERT INTO cqt_entries (entry_no, source_channel_id, source_database, source_table, source_id,"
                        + " competition_id, stage_scope, title, entry_type, scoring_scope, status) VALUES"
                        + " (?, 1, 'houtai', 'it', ?, ?, 'NATIONAL', '国赛作品', 'INDIVIDUAL', 'ENTRY', 'ACTIVE')",
                "IT-N-" + nationalId,
                System.nanoTime(),
                SEPARATE);
        final Long nationalEntry = this.jdbc.queryForObject(
                "SELECT id FROM cqt_entries WHERE entry_no = ?", Long.class, "IT-N-" + nationalId);
        this.jdbc.update(
                "INSERT INTO cqt_entries (entry_no, source_channel_id, source_database, source_table, source_id,"
                        + " competition_id, stage_scope, title, entry_type, scoring_scope, status) VALUES"
                        + " (?, 1, 'houtai', 'it', ?, ?, 'BOTH', '共用作品', 'INDIVIDUAL', 'ENTRY', 'ACTIVE')",
                "IT-B-" + bothId,
                System.nanoTime(),
                SEPARATE);
        final Long bothEntry =
                this.jdbc.queryForObject("SELECT id FROM cqt_entries WHERE entry_no = ?", Long.class, "IT-B-" + bothId);
        this.jdbc.update(
                "INSERT INTO cqt_competition_participation_keys (competition_id, stage_scope, category_legacy_id,"
                        + " credential_type, normalized_id_card, entry_id, entry_participant_id, source_database) VALUES"
                        + " (?, 'NATIONAL', 9001, 'ID_CARD', ?, ?, 0, 'houtai'), (?, 'BOTH', 9001, 'ID_CARD', ?, ?, 0, 'houtai')",
                SEPARATE,
                nationalId,
                nationalEntry,
                SEPARATE,
                bothId,
                bothEntry);

        final ResponseEntity<JsonNode> ok = this.signup(nationalToken, CqtSignupIT.form(SEPARATE, 9001, 0));
        CqtSignupIT.assertPortalOk(ok);
        assertThat(this.jdbc.queryForObject(
                        "SELECT stage_scope FROM cqt_entries WHERE id = ?",
                        String.class,
                        IntegrationTestSupport.data(ok).path("productid").asLong()))
                .isEqualTo("PROVINCIAL");

        final ResponseEntity<JsonNode> conflict = this.signup(bothToken, CqtSignupIT.form(SEPARATE, 9001, 0));
        assertThat(IntegrationTestSupport.body(conflict).path("code").asInt()).isEqualTo(409);
        assertThat(IntegrationTestSupport.body(conflict).path("message").asText())
                .contains("IT-B-" + bothId, "后台");
    }

    @Test
    @DisplayName("拒绝：二级不属于一级、组别未配置、外站 ZIP、赛项要求附件未提交、停用赛事、作品名缺失")
    void rejects() {
        final String token = this.accountWithIdCard(CqtIntegrationTestSupport.uniqueIdCard());
        CqtSignupIT.assertPortalError(
                this.signup(token, CqtSignupIT.form(SHARED, 9001, 9021)), 400, "所选专业不存在、未启用或不属于当前赛项");

        final Map<String, Object> badGroup = CqtSignupIT.form(SHARED, 9001, 0);
        badGroup.put("zubie", "大学组");
        final ResponseEntity<JsonNode> groupResponse = this.signup(token, badGroup);
        assertThat(IntegrationTestSupport.body(groupResponse).path("code").asInt())
                .isEqualTo(400);
        assertThat(IntegrationTestSupport.body(groupResponse).path("message").asText())
                .contains("大学组");

        final Map<String, Object> foreignZip = CqtSignupIT.form(SHARED, 9001, 0);
        foreignZip.put("purl", "https://other.com/a.zip");
        CqtSignupIT.assertPortalError(this.signup(token, foreignZip), 400, "ZIP附件必须选择并上传本系统中的.zip压缩包");

        final Map<String, Object> missingAttachment = CqtSignupIT.form(SHARED, 9002, 0);
        missingAttachment.put("purl", "");
        missingAttachment.put("zubie", "专业组");
        CqtSignupIT.assertPortalError(this.signup(token, missingAttachment), 400, "当前赛项要求提交作品附件");

        CqtSignupIT.assertPortalError(this.signup(token, CqtSignupIT.form(DRAFT, 9001, 0)), 409, "所选赛事尚未启用");
        CqtSignupIT.assertPortalError(this.signup(token, CqtSignupIT.form(PAST, 9001, 0)), 409, "所选赛事尚未启用");

        final Map<String, Object> noTitle = CqtSignupIT.form(SHARED, 9001, 0);
        noTitle.put("title", " ");
        CqtSignupIT.assertPortalError(this.signup(token, noTitle), 400, "赛事和作品名称不能为空");
        CqtSignupIT.assertPortalError(this.signup(null, CqtSignupIT.form(SHARED, 9001, 0)), 401, "请求参数缺token");
    }

    private int count(final String table, final long entryId) {
        final Integer count = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE entry_id = ?", Integer.class, entryId);
        return count == null ? 0 : count;
    }
}
