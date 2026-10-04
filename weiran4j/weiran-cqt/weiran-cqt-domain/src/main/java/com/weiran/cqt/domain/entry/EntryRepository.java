package com.weiran.cqt.domain.entry;

import com.weiran.cqt.domain.account.CredentialType;
import com.weiran.cqt.domain.competition.EntryStage;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 作品、人员、参赛人、参赛唯一键与评审对象的仓储端口。 */
public interface EntryRepository {

    /** 同一赛事、同一一级赛项、同一证件、阶段冲突的已有参赛记录（任取一条）。 */
    Optional<ParticipationConflict> findConflict(
            long competitionId, long categoryLegacyId, CredentialType type, String idCard, EntryStage stage);

    /** 写入作品，返回 ID。 */
    long insertEntry(NewEntry entry);

    /**
     * 写入人员与参赛人，返回参赛人 ID。
     *
     * @param entryId 作品 ID
     * @param participant 参赛人
     * @param accountSourceDatabase 报名账号的来源库（人员按它与旧用户编号关联回账号；原系统固定写 zhongxi，渠道账号会看不到自己的报名）
     * @param legacyUserId 账号旧用户编号（只第一位成员记）
     * @param sourceId 来源编号
     * @param leader 是否队长
     * @param sortOrder 顺序
     * @param now 时间
     */
    long insertParticipant(
            long entryId,
            Participant participant,
            String accountSourceDatabase,
            @Nullable Long legacyUserId,
            long sourceId,
            boolean leader,
            int sortOrder,
            LocalDateTime now);

    /**
     * 写入参赛唯一键。
     *
     * @throws DuplicateParticipationException 同阶段已存在
     */
    void insertParticipationKey(
            long competitionId,
            EntryStage stage,
            long categoryLegacyId,
            Participant participant,
            long entryId,
            long participantId);

    /** 写入作品级评审对象。 */
    void insertEntryTarget(long entryId);

    /** 某账号（来源库 + 旧用户编号）作为参赛人的全部未删除作品，按作品 ID 倒序。 */
    List<MyEntryRow> findByAccount(String sourceDatabase, long legacyUserId);

    /** 该账号是否为作品的参赛人。 */
    boolean isParticipant(long entryId, String sourceDatabase, long legacyUserId);

    /** 作品详情。 */
    Optional<EntryDetailRow> findDetail(long entryId);

    /** 作品成员，按顺序。 */
    List<TeamMemberRow> findTeam(long entryId);
}
