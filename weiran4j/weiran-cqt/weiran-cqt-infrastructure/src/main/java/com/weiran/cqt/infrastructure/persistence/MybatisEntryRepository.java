package com.weiran.cqt.infrastructure.persistence;

import com.weiran.cqt.domain.account.CredentialType;
import com.weiran.cqt.domain.competition.EntryStage;
import com.weiran.cqt.domain.entry.DuplicateParticipationException;
import com.weiran.cqt.domain.entry.EntryDetailRow;
import com.weiran.cqt.domain.entry.EntryRepository;
import com.weiran.cqt.domain.entry.MyEntryRow;
import com.weiran.cqt.domain.entry.NewEntry;
import com.weiran.cqt.domain.entry.Participant;
import com.weiran.cqt.domain.entry.ParticipationConflict;
import com.weiran.cqt.domain.entry.TeamMemberRow;
import com.weiran.cqt.infrastructure.persistence.entity.CqtEntryDO;
import com.weiran.cqt.infrastructure.persistence.entity.CqtEntryParticipantDO;
import com.weiran.cqt.infrastructure.persistence.entity.CqtEvaluationTargetDO;
import com.weiran.cqt.infrastructure.persistence.entity.CqtParticipationKeyDO;
import com.weiran.cqt.infrastructure.persistence.entity.CqtPersonDO;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtEntryMapper;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtEntryParticipantMapper;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtEvaluationTargetMapper;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtParticipationKeyMapper;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtPersonMapper;
import com.weiran.cqt.infrastructure.persistence.row.ConflictRow;
import com.weiran.cqt.infrastructure.persistence.row.EntryDetailRowDO;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DuplicateKeyException;

/**
 * {@link EntryRepository} 的 MyBatis-Plus 实现。前台报名写入的来源固定为 {@code zhongxi / fastapi_signup}（同原系统），
 * 账号与参赛人靠 {@code (source_database, legacy_user_id)} 关联。
 */
public class MybatisEntryRepository implements EntryRepository {

    /** 前台报名的来源库。 */
    static final String SOURCE_DATABASE = "zhongxi";

    /** 前台报名的来源表标记。 */
    static final String SOURCE_TABLE = "fastapi_signup";

    private final CqtEntryMapper entryMapper;

    private final CqtPersonMapper personMapper;

    private final CqtEntryParticipantMapper participantMapper;

    private final CqtParticipationKeyMapper keyMapper;

    private final CqtEvaluationTargetMapper targetMapper;

    /** 构造仓储。 */
    public MybatisEntryRepository(
            final CqtEntryMapper entryMapper,
            final CqtPersonMapper personMapper,
            final CqtEntryParticipantMapper participantMapper,
            final CqtParticipationKeyMapper keyMapper,
            final CqtEvaluationTargetMapper targetMapper) {
        this.entryMapper = entryMapper;
        this.personMapper = personMapper;
        this.participantMapper = participantMapper;
        this.keyMapper = keyMapper;
        this.targetMapper = targetMapper;
    }

    @Override
    public Optional<ParticipationConflict> findConflict(
            final long competitionId,
            final long categoryLegacyId,
            final CredentialType type,
            final String idCard,
            final EntryStage stage) {
        final ConflictRow row =
                this.keyMapper.findConflict(competitionId, categoryLegacyId, type.name(), idCard, stage.name());
        return row == null
                ? Optional.empty()
                : Optional.of(new ParticipationConflict(
                        Objects.requireNonNullElse(row.getSourceDatabase(), ""),
                        Objects.requireNonNullElse(row.getEntryNo(), ""),
                        Objects.requireNonNullElse(row.getTitle(), "")));
    }

    @Override
    public long insertEntry(final NewEntry entry) {
        final CqtEntryDO row = new CqtEntryDO();
        row.setEntryNo(entry.entryNo());
        row.setSourceChannelId(entry.sourceChannelId());
        row.setSourceDatabase(MybatisEntryRepository.SOURCE_DATABASE);
        row.setSourceTable(MybatisEntryRepository.SOURCE_TABLE);
        row.setSourceId(entry.sourceId());
        row.setCompetitionId(entry.competitionId());
        row.setStageScope(entry.stage().name());
        row.setLegacyCompetitionId(entry.legacyCompetitionId());
        row.setFirstCategoryLegacyId(entry.firstCategoryLegacyId());
        row.setSecondCategoryLegacyId(entry.secondCategoryLegacyId());
        row.setRegionLegacyId(entry.regionLegacyId());
        row.setLegacySchoolId(entry.legacySchoolId());
        row.setTitle(entry.title());
        row.setDescription(entry.description());
        row.setAttachmentUrl(entry.attachment().url());
        row.setAttachmentName(entry.attachment().name());
        row.setAttachmentType(
                entry.attachment().url() == null
                        ? null
                        : entry.attachment().type().name());
        row.setTeacherNames(entry.teacherNames());
        row.setMajorName(entry.majorName());
        row.setGroupName(entry.groupName());
        row.setEntryType(entry.team() ? "TEAM" : "INDIVIDUAL");
        row.setDeclaredGroupSize(entry.groupSize());
        row.setScoringScope("ENTRY");
        row.setStatus("ACTIVE");
        row.setLegacyStatus(1);
        row.setSubmittedAt(entry.now());
        row.setCreatedAt(entry.now());
        row.setUpdatedAt(entry.now());
        this.entryMapper.insert(row);
        return row.getId();
    }

    @Override
    public long insertParticipant(
            final long entryId,
            final Participant participant,
            final String accountSourceDatabase,
            final @Nullable Long legacyUserId,
            final long sourceId,
            final boolean leader,
            final int sortOrder,
            final LocalDateTime now) {
        final CqtPersonDO person = new CqtPersonDO();
        person.setSourceDatabase(accountSourceDatabase);
        person.setSourceTable(MybatisEntryRepository.SOURCE_TABLE);
        person.setSourceId(sourceId);
        person.setLegacyUserId(legacyUserId);
        person.setNameValue(participant.name());
        person.setIdCardValue(participant.idCard());
        person.setNormalizedIdCard(participant.idCard());
        person.setCredentialType(participant.credentialType().name());
        person.setPhoneValue(participant.phone());
        person.setSchoolValue(participant.school());
        person.setIdentityStatus(participant.idCard().isEmpty() ? "PARTIAL" : "COMPLETE");
        person.setCreatedAt(now);
        person.setUpdatedAt(now);
        this.personMapper.insert(person);

        final CqtEntryParticipantDO row = new CqtEntryParticipantDO();
        row.setEntryId(entryId);
        row.setPersonId(person.getId());
        row.setSourceDatabase(MybatisEntryRepository.SOURCE_DATABASE);
        row.setSourceTable(MybatisEntryRepository.SOURCE_TABLE);
        row.setSourceId(sourceId);
        row.setIsLeader(leader);
        row.setSchoolSnapshot(participant.school());
        row.setGroupSnapshot(participant.group());
        row.setSortOrder(sortOrder);
        row.setStatus("ACTIVE");
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        this.participantMapper.insert(row);
        return row.getId();
    }

    @Override
    public void insertParticipationKey(
            final long competitionId,
            final EntryStage stage,
            final long categoryLegacyId,
            final Participant participant,
            final long entryId,
            final long participantId) {
        final CqtParticipationKeyDO row = new CqtParticipationKeyDO();
        row.setCompetitionId(competitionId);
        row.setStageScope(stage.name());
        row.setCategoryLegacyId(categoryLegacyId);
        row.setCredentialType(participant.credentialType().name());
        row.setNormalizedIdCard(participant.idCard());
        row.setEntryId(entryId);
        row.setEntryParticipantId(participantId);
        row.setSourceDatabase(MybatisEntryRepository.SOURCE_DATABASE);
        try {
            this.keyMapper.insert(row);
        } catch (final DuplicateKeyException ex) {
            throw new DuplicateParticipationException(ex);
        }
    }

    @Override
    public void insertEntryTarget(final long entryId) {
        final CqtEvaluationTargetDO row = new CqtEvaluationTargetDO();
        row.setEntryId(entryId);
        row.setTargetType("ENTRY");
        row.setStatus("ACTIVE");
        this.targetMapper.insert(row);
    }

    @Override
    public List<MyEntryRow> findByAccount(final String sourceDatabase, final long legacyUserId) {
        return this.entryMapper.findByAccount(sourceDatabase, legacyUserId).stream()
                .map(row -> new MyEntryRow(
                        Objects.requireNonNullElse(row.getEntryId(), 0L),
                        Objects.requireNonNullElse(row.getCompetitionId(), 0L),
                        row.getCompetitionName(),
                        row.getTitle(),
                        Objects.requireNonNullElse(row.getStatus(), ""),
                        row.getLegacyStatus(),
                        row.getFirstCategoryLegacyId(),
                        row.getSecondCategoryLegacyId(),
                        row.getRegionLegacyId(),
                        row.getAttachmentUrl(),
                        row.getTeacherNames(),
                        row.getCreatedAt(),
                        Objects.requireNonNullElse(row.getSourceDatabase(), ""),
                        "TEAM".equals(row.getEntryType()),
                        row.getLeaderName(),
                        row.getLeaderPhone()))
                .toList();
    }

    @Override
    public boolean isParticipant(final long entryId, final String sourceDatabase, final long legacyUserId) {
        return this.entryMapper.isParticipant(entryId, sourceDatabase, legacyUserId);
    }

    @Override
    public Optional<EntryDetailRow> findDetail(final long entryId) {
        final EntryDetailRowDO row = this.entryMapper.findDetail(entryId);
        if (row == null) {
            return Optional.empty();
        }
        return Optional.of(new EntryDetailRow(
                Objects.requireNonNullElse(row.getEntryId(), entryId),
                Objects.requireNonNullElse(row.getEntryNo(), ""),
                Objects.requireNonNullElse(row.getCompetitionId(), 0L),
                row.getCompetitionName(),
                Objects.requireNonNullElse(row.getStageScope(), "BOTH"),
                row.getFirstCategoryLegacyId(),
                row.getFirstCategoryName(),
                row.getSecondCategoryLegacyId(),
                row.getSecondCategoryName(),
                row.getRegionLegacyId(),
                row.getRegionName(),
                row.getLegacySchoolId(),
                row.getTitle(),
                row.getDescription(),
                row.getAttachmentUrl(),
                row.getAttachmentName(),
                row.getAttachmentType(),
                row.getTeacherNames(),
                row.getMajorName(),
                row.getGroupName(),
                "TEAM".equals(row.getEntryType()),
                Objects.requireNonNullElse(row.getStatus(), ""),
                row.getLegacyStatus(),
                row.getSubmittedAt(),
                row.getCreatedAt()));
    }

    @Override
    public List<TeamMemberRow> findTeam(final long entryId) {
        return this.entryMapper.findTeam(entryId).stream()
                .map(row -> new TeamMemberRow(
                        Objects.requireNonNullElse(row.getParticipantId(), 0L),
                        row.getName(),
                        row.getIdCard(),
                        row.getCredentialType(),
                        row.getPhone(),
                        row.getSchool(),
                        row.getGroupName(),
                        Boolean.TRUE.equals(row.getLeader())))
                .toList();
    }
}
