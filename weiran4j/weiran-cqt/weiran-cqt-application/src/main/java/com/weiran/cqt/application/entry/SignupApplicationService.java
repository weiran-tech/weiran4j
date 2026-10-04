package com.weiran.cqt.application.entry;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.cqt.api.entry.SignupCommand;
import com.weiran.cqt.api.entry.SignupResult;
import com.weiran.cqt.api.entry.SignupService;
import com.weiran.cqt.domain.account.Account;
import com.weiran.cqt.domain.account.AccountRepository;
import com.weiran.cqt.domain.account.AccountTypes;
import com.weiran.cqt.domain.account.Credentials;
import com.weiran.cqt.domain.competition.Category;
import com.weiran.cqt.domain.competition.Competition;
import com.weiran.cqt.domain.competition.CompetitionRepository;
import com.weiran.cqt.domain.competition.EntryStage;
import com.weiran.cqt.domain.competition.Group;
import com.weiran.cqt.domain.entry.Attachment;
import com.weiran.cqt.domain.entry.DuplicateParticipationException;
import com.weiran.cqt.domain.entry.EntryRepository;
import com.weiran.cqt.domain.entry.EntryText;
import com.weiran.cqt.domain.entry.NewEntry;
import com.weiran.cqt.domain.entry.Participant;
import com.weiran.cqt.domain.entry.SequenceGenerator;
import com.weiran.cqt.domain.entry.SignupRules;
import com.weiran.cqt.domain.entry.TeamMembers;
import com.weiran.cqt.domain.file.FileStorage;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link SignupService} 实现（校验顺序与提示语沿用原系统 {@code competition.signup}）。
 *
 * <p>同阶段并发重复由参赛唯一键兜底：写唯一键撞键时整笔报名回滚并返回 409。
 */
@Slf4j
public class SignupApplicationService implements SignupService {

    /** 报名号序列名（沿用原系统，历史序号连续）。 */
    static final String ENTRY_SEQUENCE = "fastapi_signup_entry";

    /** 人员 / 参赛人来源编号序列名。 */
    static final String PERSON_SEQUENCE = "fastapi_signup_person";

    private final AccountRepository accountRepository;

    private final CompetitionRepository competitionRepository;

    private final EntryRepository entryRepository;

    private final SequenceGenerator sequenceGenerator;

    private final ObjectProvider<FileStorage> storages;

    private final Clock clock;

    /** 构造服务。 */
    public SignupApplicationService(
            final AccountRepository accountRepository,
            final CompetitionRepository competitionRepository,
            final EntryRepository entryRepository,
            final SequenceGenerator sequenceGenerator,
            final ObjectProvider<FileStorage> storages,
            final Clock clock) {
        this.accountRepository = accountRepository;
        this.competitionRepository = competitionRepository;
        this.entryRepository = entryRepository;
        this.sequenceGenerator = sequenceGenerator;
        this.storages = storages;
        this.clock = clock;
    }

    @Override
    @Transactional
    public SignupResult signup(final long accountId, final SignupCommand command) {
        final Account account =
                this.accountRepository.findById(accountId).orElseThrow(() -> BizException.notFound("当前用户不存在"));
        final String title = EntryText.normalize(command.title());
        final Long competitionId = command.competitionId();
        if (title.isEmpty() || competitionId == null || competitionId == 0) {
            throw BizException.badRequest("赛事和作品名称不能为空");
        }
        final Competition competition =
                this.competitionRepository.findById(competitionId).orElseThrow(() -> BizException.notFound("赛事不存在"));
        final LocalDateTime now = LocalDateTime.now(this.clock);
        competition.requireOpenForSignup(now);
        final EntryStage stage = competition.portalSignupStage();
        final List<Participant> participants = this.participants(account, command, now.toLocalDate());

        final long firstId = Objects.requireNonNullElse(command.firstCategoryId(), 0L);
        if (firstId == 0) {
            throw BizException.badRequest("赛项不能为空");
        }
        final Category first = this.competitionRepository
                .findCategory(firstId)
                .filter(c -> c.isFirstLevel() && c.isEnabled())
                .orElseThrow(() -> BizException.badRequest("所选赛项不存在或未启用"));
        final long secondId = Objects.requireNonNullElse(command.secondCategoryId(), 0L);
        final Category second = secondId == 0
                ? null
                : this.competitionRepository
                        .findCategory(secondId)
                        .filter(c -> c.parentLegacyId() == firstId && c.isEnabled())
                        .orElseThrow(() -> BizException.badRequest("所选专业不存在、未启用或不属于当前赛项"));
        final FileStorage storage = this.storages.getIfAvailable();
        final Attachment attachment = Attachment.parse(
                command.attachmentType(),
                command.attachmentUrl(),
                command.attachmentName(),
                first.attachmentRequired() || (second != null && second.attachmentRequired()),
                url -> storage != null && storage.isStoredUrl(url));
        final Set<String> groups =
                this.competitionRepository.findEnabledGroups(competition.id(), firstId, secondId).stream()
                        .map(Group::name)
                        .collect(Collectors.toSet());
        SignupRules.requireConfiguredGroups(participants, groups);
        for (int i = 0; i < participants.size(); i++) {
            final Participant participant = participants.get(i);
            final int index = i + 1;
            this.entryRepository
                    .findConflict(competition.id(), firstId, participant.credentialType(), participant.idCard(), stage)
                    .ifPresent(conflict -> {
                        throw new BizException(
                                CommonErrors.CONFLICT,
                                SignupRules.conflictMessage(index, participant.name(), conflict));
                    });
        }

        final long sequence = this.sequenceGenerator.next(SignupApplicationService.ENTRY_SEQUENCE);
        final String entryNo = SignupRules.entryNo(competition.id(), sequence);
        final long entryId = this.entryRepository.insertEntry(new NewEntry(
                entryNo,
                Objects.equals(account.getUserType(), AccountTypes.SCHOOL) ? 2 : 1,
                sequence,
                competition.id(),
                competition.legacyId(),
                stage,
                firstId,
                secondId == 0 ? null : secondId,
                command.regionId(),
                command.schoolId() != null
                        ? command.schoolId()
                        : SignupApplicationService.numeric(account.getSchoolId()),
                title,
                command.description(),
                attachment,
                command.teacherNames(),
                command.major(),
                participants.get(0).group(),
                command.team(),
                participants.size(),
                now));
        for (int i = 0; i < participants.size(); i++) {
            final Participant participant = participants.get(i);
            final long participantId = this.entryRepository.insertParticipant(
                    entryId,
                    participant,
                    account.getSourceDatabase(),
                    i == 0 ? account.getLegacyUserId() : null,
                    this.sequenceGenerator.next(SignupApplicationService.PERSON_SEQUENCE),
                    i == 0,
                    i,
                    now);
            try {
                this.entryRepository.insertParticipationKey(
                        competition.id(), stage, firstId, participant, entryId, participantId);
            } catch (final DuplicateParticipationException ex) {
                throw new BizException(CommonErrors.CONFLICT, "“" + participant.name() + "”已在本届同一赛项报名，请勿重复报名");
            }
        }
        this.entryRepository.insertEntryTarget(entryId);
        SignupApplicationService.log.info(
                "前台报名成功 account={} entry={} entryNo={} competition={} category={} stage={} members={}",
                accountId,
                entryId,
                entryNo,
                competition.id(),
                firstId,
                stage,
                participants.size());
        return new SignupResult(entryId, entryNo);
    }

    private List<Participant> participants(final Account account, final SignupCommand command, final LocalDate today) {
        if (command.team()) {
            final List<Map<String, Object>> members = command.teamMembers();
            return TeamMembers.parse(members == null ? List.of() : members, today);
        }
        final String idCard;
        try {
            idCard = Credentials.requireValid(account.getCredentialType(), account.getIdCard(), today);
        } catch (final BizException ex) {
            throw BizException.badRequest("当前账号证件信息不完整：" + ex.getMessage());
        }
        final List<Participant> result = new ArrayList<>();
        result.add(new Participant(
                account.getName(),
                account.getCredentialType(),
                idCard,
                account.getPhone(),
                account.getSchool(),
                account.getSex(),
                EntryText.normalize(command.group())));
        return result;
    }

    private static @Nullable Long numeric(final @Nullable String value) {
        if (value == null) {
            return null;
        }
        final String text = value.strip();
        return !text.isEmpty() && text.chars().allMatch(Character::isDigit) && text.length() < 19
                ? Long.valueOf(text)
                : null;
    }
}
