package com.weiran.cqt.infrastructure.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.weiran.cqt.infrastructure.persistence.entity.CqtEntryDO;
import com.weiran.cqt.infrastructure.persistence.row.EntryDetailRowDO;
import com.weiran.cqt.infrastructure.persistence.row.MyEntryRowDO;
import com.weiran.cqt.infrastructure.persistence.row.TeamMemberRowDO;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** {@link CqtEntryDO} 的 Mapper（含前台列表与详情的联表查询）。 */
public interface CqtEntryMapper extends BaseMapper<CqtEntryDO> {

    /** 账号作为参赛人的未删除作品（口径同原系统 {@code user_entries}），队长信息随行带出。 */
    @Select(
            "SELECT DISTINCT e.id entry_id, e.competition_id, c.name competition_name, e.title, e.status, e.legacy_status,"
                    + " e.first_category_legacy_id, e.second_category_legacy_id, e.region_legacy_id, e.attachment_url,"
                    + " e.teacher_names, e.created_at, e.source_database, e.entry_type,"
                    + " (SELECT p2.name_value FROM cqt_entry_participants ep2 JOIN cqt_people p2 ON p2.id = ep2.person_id"
                    + "   WHERE ep2.entry_id = e.id ORDER BY ep2.is_leader DESC, ep2.sort_order, ep2.id LIMIT 1) leader_name,"
                    + " (SELECT p2.phone_value FROM cqt_entry_participants ep2 JOIN cqt_people p2 ON p2.id = ep2.person_id"
                    + "   WHERE ep2.entry_id = e.id ORDER BY ep2.is_leader DESC, ep2.sort_order, ep2.id LIMIT 1) leader_phone"
                    + " FROM cqt_entries e JOIN cqt_entry_participants ep ON ep.entry_id = e.id"
                    + " JOIN cqt_people p ON p.id = ep.person_id JOIN cqt_competitions c ON c.id = e.competition_id"
                    + " WHERE p.source_database = #{source} AND p.legacy_user_id = #{legacyUserId} AND e.status <> 'DELETED'"
                    + " ORDER BY e.id DESC")
    List<MyEntryRowDO> findByAccount(@Param("source") String sourceDatabase, @Param("legacyUserId") long legacyUserId);

    /** 账号是否为作品的参赛人。 */
    @Select(
            "SELECT COUNT(*) > 0 FROM cqt_entry_participants ep JOIN cqt_people p ON p.id = ep.person_id"
                    + " WHERE ep.entry_id = #{entryId} AND p.source_database = #{source} AND p.legacy_user_id = #{legacyUserId}")
    boolean isParticipant(
            @Param("entryId") long entryId,
            @Param("source") String sourceDatabase,
            @Param("legacyUserId") long legacyUserId);

    /** 作品详情与关联名称。 */
    @Select("SELECT e.id entry_id, e.entry_no, e.competition_id, c.name competition_name, e.stage_scope,"
            + " e.first_category_legacy_id, fc.name first_category_name, e.second_category_legacy_id,"
            + " sc.name second_category_name, e.region_legacy_id, r.name region_name, e.legacy_school_id, e.title,"
            + " e.description, e.attachment_url, e.attachment_name, e.attachment_type, e.teacher_names, e.major_name,"
            + " e.group_name, e.entry_type, e.status, e.legacy_status, e.submitted_at, e.created_at"
            + " FROM cqt_entries e JOIN cqt_competitions c ON c.id = e.competition_id"
            + " LEFT JOIN cqt_regions r ON r.legacy_id = e.region_legacy_id"
            + " LEFT JOIN cqt_competition_categories fc ON fc.legacy_id = e.first_category_legacy_id"
            + " LEFT JOIN cqt_competition_categories sc ON sc.legacy_id = e.second_category_legacy_id"
            + " WHERE e.id = #{entryId}")
    EntryDetailRowDO findDetail(@Param("entryId") long entryId);

    /** 作品成员，按顺序。 */
    @Select(
            "SELECT ep.id participant_id, p.name_value name, p.id_card_value id_card, p.credential_type, p.phone_value phone,"
                    + " p.school_value school, ep.group_snapshot group_name, ep.is_leader leader"
                    + " FROM cqt_entry_participants ep JOIN cqt_people p ON p.id = ep.person_id"
                    + " WHERE ep.entry_id = #{entryId} ORDER BY ep.sort_order, ep.id")
    List<TeamMemberRowDO> findTeam(@Param("entryId") long entryId);
}
