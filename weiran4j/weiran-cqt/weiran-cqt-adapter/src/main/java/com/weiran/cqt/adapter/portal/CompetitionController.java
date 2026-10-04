package com.weiran.cqt.adapter.portal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.common.error.BizException;
import com.weiran.cqt.api.entry.EntryDetailView;
import com.weiran.cqt.api.entry.MyEntriesService;
import com.weiran.cqt.api.entry.SignupCommand;
import com.weiran.cqt.api.entry.SignupResult;
import com.weiran.cqt.api.entry.SignupService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

/** 前台「报名」接口组（沿用原系统 {@code /api/competition/*} 的路径与字段名；需登录）。 */
@PortalController
@RequestMapping("/api-web/competition")
public class CompetitionController {

    private static final TypeReference<List<Map<String, Object>>> MEMBERS = new TypeReference<>() {};

    private final SignupService signupService;

    private final MyEntriesService myEntriesService;

    private final ObjectMapper objectMapper;

    /** 构造 Controller。 */
    public CompetitionController(
            final SignupService signupService,
            final MyEntriesService myEntriesService,
            final ObjectMapper objectMapper) {
        this.signupService = signupService;
        this.myEntriesService = myEntriesService;
        this.objectMapper = objectMapper;
    }

    /** 个人 / 团体报名，返回 {@code {productid, entry_no}}。 */
    @PostMapping("/signup")
    public PortalResult<Map<String, Object>> signup(@RequestBody final Map<String, Object> body) {
        final boolean team =
                "1".equals(String.valueOf(body.getOrDefault("istuandui", "0")).strip());
        final Object competition =
                body.get("competitionid") != null ? body.get("competitionid") : body.get("competition_id");
        final Object second = CompetitionController.first(body, "secaodcatid", "secondcatid", "majorid");
        final SignupResult result = this.signupService.signup(
                PortalAccount.current().orElseThrow(),
                new SignupCommand(
                        PortalParams.longValue("competitionid", competition),
                        PortalParams.text(body.get("title")),
                        PortalParams.longValue("firstcatid", body.get("firstcatid")),
                        PortalParams.longValue("secaodcatid", second),
                        PortalParams.text(body.get("zubie")),
                        team,
                        team ? this.members(body.get("team_members")) : null,
                        PortalParams.longOrNull(body.get("regionsid")),
                        PortalParams.longOrNull(body.get("schoolid")),
                        PortalParams.text(body.get("teachername")),
                        PortalParams.text(body.get("description")),
                        PortalParams.text(body.get("major")),
                        PortalParams.text(body.get("attachment_type")),
                        PortalParams.text(body.get("purl")),
                        PortalParams.text(body.get("purlname"))));
        final Map<String, Object> data = new LinkedHashMap<>();
        data.put("productid", result.productId());
        data.put("entry_no", result.entryNo());
        return PortalResult.ok(data);
    }

    /** 报名详情（只能看自己的）。 */
    @GetMapping("/signupdetail")
    public PortalResult<Map<String, @Nullable Object>> signupDetail(
            @RequestParam(value = "productid", required = false) final @Nullable String productId) {
        final Long entryId = PortalParams.longOrNull(productId);
        final EntryDetailView view =
                this.myEntriesService.detail(PortalAccount.current().orElseThrow(), entryId == null ? 0 : entryId);
        final Map<String, @Nullable Object> info = new LinkedHashMap<>();
        info.put("id", view.productId());
        info.put("entry_no", view.entryNo());
        info.put("competition_id", view.competitionId());
        info.put("stage_scope", view.stage());
        info.put("first_category_legacy_id", view.firstCategoryId());
        info.put("second_category_legacy_id", view.secondCategoryId());
        info.put("region_legacy_id", view.regionId());
        info.put("legacy_school_id", view.schoolId());
        info.put("title", view.title());
        info.put("description", view.description());
        info.put("attachment_url", view.attachmentUrl());
        info.put("attachment_name", view.attachmentName());
        info.put("attachment_type", view.attachmentType());
        info.put("teacher_names", view.teacherNames());
        info.put("major_name", view.major());
        info.put("group_name", view.group());
        info.put("entry_type", view.team() ? "TEAM" : "INDIVIDUAL");
        info.put("status", view.status());
        info.put("legacy_status", view.legacyStatus());
        info.put("submitted_at", view.submittedAt());
        info.put("created_at", view.createdAt());
        info.put("zubie", view.group());
        info.put("major", view.major());
        info.put("purl", view.attachmentUrl());
        info.put("purlname", view.attachmentName());
        info.put("teachername", view.teacherNames());
        info.put("teantype", view.team() ? 1 : 0);
        info.put("competition_name", view.competitionName());
        info.put("region_name", view.regionName());
        info.put("firstcatid_name", view.firstCategoryName());
        info.put("secondcatid_name", view.secondCategoryName());
        final List<Map<String, @Nullable Object>> team = new ArrayList<>();
        for (final EntryDetailView.Member member : view.members()) {
            final Map<String, @Nullable Object> row = new LinkedHashMap<>();
            row.put("id", member.id());
            row.put("name", member.name());
            row.put("idcard", member.idCard());
            row.put("credential_type", member.credentialType());
            row.put("phone", member.phone());
            row.put("school", member.school());
            row.put("group", member.group());
            row.put("is_leader", member.leader() ? 1 : 0);
            team.add(row);
        }
        final Map<String, @Nullable Object> data = new LinkedHashMap<>();
        data.put("productinfo", info);
        data.put("region_name", view.regionName());
        data.put("msg", view.message());
        data.put("step", view.step());
        // 省奖 / 国奖在评审与奖项切片补上。
        data.put("shengAward", null);
        data.put("guoAward", null);
        data.put("team", team);
        return PortalResult.ok(data);
    }

    /** 团体成员：JSON 数组或其字符串；其它形状报 400「团体成员数据格式错误」。 */
    private List<Map<String, Object>> members(final @Nullable Object raw) {
        if (raw == null) {
            return List.of();
        }
        try {
            if (raw instanceof final String text) {
                return text.isBlank() ? List.of() : this.objectMapper.readValue(text, CompetitionController.MEMBERS);
            }
            return this.objectMapper.convertValue(raw, CompetitionController.MEMBERS);
        } catch (final JsonProcessingException | IllegalArgumentException ex) {
            throw BizException.badRequest("团体成员数据格式错误");
        }
    }

    private static @Nullable Object first(final Map<String, Object> body, final String... keys) {
        for (final String key : keys) {
            final Object value = body.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return value;
            }
        }
        return null;
    }
}
