package com.weiran.cqt.adapter.portal;

import com.weiran.cqt.api.competition.CategoryView;
import com.weiran.cqt.api.competition.CompetitionQueryService;
import com.weiran.cqt.api.competition.CompetitionView;
import com.weiran.cqt.api.competition.GroupView;
import com.weiran.cqt.api.entry.MyEntriesService;
import com.weiran.cqt.api.entry.MyEntryView;
import com.weiran.cqt.api.region.RegionService;
import com.weiran.cqt.api.region.RegionView;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

/** 前台「赛事分类」接口组（沿用原系统 {@code /api/competcategory/*} 的分组名）。 */
@PortalController
@RequestMapping("/api-web/competcategory")
public class CompetCategoryController {

    private final RegionService regionService;

    private final CompetitionQueryService competitionQueryService;

    private final MyEntriesService myEntriesService;

    /** 构造 Controller。 */
    public CompetCategoryController(
            final RegionService regionService,
            final CompetitionQueryService competitionQueryService,
            final MyEntriesService myEntriesService) {
        this.regionService = regionService;
        this.competitionQueryService = competitionQueryService;
        this.myEntriesService = myEntriesService;
    }

    /** 赛区列表（公开）。 */
    @PortalPublic
    @RequestMapping(
            value = "/regions",
            method = {RequestMethod.GET, RequestMethod.POST})
    public PortalResult<List<RegionView>> regions() {
        return PortalResult.ok(this.regionService.list());
    }

    /** 赛事列表（公开），可按 {@code status}、{@code name} 过滤。 */
    @PortalPublic
    @RequestMapping(
            value = "/competitionlists",
            method = {RequestMethod.GET, RequestMethod.POST})
    public PortalResult<List<Map<String, @Nullable Object>>> competitionLists(
            @RequestParam(value = "status", required = false) final @Nullable String status,
            @RequestParam(value = "name", required = false) final @Nullable String name) {
        final Long statusValue = PortalParams.longValue("status", status);
        final List<Map<String, @Nullable Object>> rows = new ArrayList<>();
        for (final CompetitionView view : this.competitionQueryService.competitions(
                statusValue == null ? null : Math.toIntExact(statusValue), name)) {
            final Map<String, @Nullable Object> row = new LinkedHashMap<>();
            row.put("id", view.id());
            row.put("legacy_id", view.legacyId());
            row.put("name", view.name());
            row.put("edition", view.edition());
            row.put("year", view.year());
            row.put("description", view.description());
            row.put("status", view.status());
            rows.add(row);
        }
        return PortalResult.ok(rows);
    }

    /** 某一级赛项下启用的二级赛项（公开；{@code competition_id} 参数忽略，赛项全局共用）。 */
    @PortalPublic
    @RequestMapping(
            value = "/secondcategory",
            method = {RequestMethod.GET, RequestMethod.POST})
    public PortalResult<List<CategoryView>> secondCategory(
            @RequestParam(value = "id", required = false) final @Nullable String id) {
        return PortalResult.ok(this.competitionQueryService.secondCategories(
                Objects.requireNonNullElse(PortalParams.longOrNull(id), 0L)));
    }

    /** 赛事、赛项适用的组别（公开）。 */
    @PortalPublic
    @GetMapping("/groups")
    public PortalResult<List<GroupView>> groups(
            @RequestParam(value = "competition_id", required = false) final @Nullable String competitionId,
            @RequestParam(value = "firstcatid", required = false) final @Nullable String firstCategoryId,
            @RequestParam(value = "secondcatid", required = false) final @Nullable String secondCategoryId) {
        return PortalResult.ok(this.competitionQueryService.groups(
                Objects.requireNonNullElse(PortalParams.longOrNull(competitionId), 0L),
                Objects.requireNonNullElse(PortalParams.longOrNull(firstCategoryId), 0L),
                Objects.requireNonNullElse(PortalParams.longOrNull(secondCategoryId), 0L)));
    }

    /** 我的报名列表（需登录），返回 {@code {data, total}}。 */
    @GetMapping("/productlists")
    public PortalResult<Map<String, Object>> productLists() {
        final List<Map<String, @Nullable Object>> rows = new ArrayList<>();
        for (final MyEntryView view :
                this.myEntriesService.list(PortalAccount.current().orElseThrow())) {
            final Map<String, @Nullable Object> row = new LinkedHashMap<>();
            row.put("productid", view.productId());
            row.put("id", view.competitionId());
            row.put("title", view.title());
            row.put("status", view.status());
            row.put("legacy_status", view.legacyStatus());
            row.put("firstcatid", view.firstCategoryId());
            row.put("secondcatid", view.secondCategoryId());
            row.put("regionsid", view.regionId());
            row.put("purl", view.attachmentUrl());
            row.put("teachername", view.teacherNames());
            row.put("created_at", view.createdAt());
            row.put("source_database", view.sourceDatabase());
            row.put("competition_name", view.competitionName());
            row.put("competition_id", view.competitionId());
            row.put("teantype", view.team() ? 1 : 0);
            row.put("username", view.leaderName());
            row.put("phone", view.leaderPhone());
            rows.add(row);
        }
        final Map<String, Object> data = new LinkedHashMap<>();
        data.put("data", rows);
        data.put("total", rows.size());
        return PortalResult.ok(data);
    }
}
