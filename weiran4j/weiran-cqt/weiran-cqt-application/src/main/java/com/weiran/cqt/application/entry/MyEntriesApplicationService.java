package com.weiran.cqt.application.entry;

import com.weiran.cqt.api.entry.EntryDetailView;
import com.weiran.cqt.api.entry.MyEntriesService;
import com.weiran.cqt.api.entry.MyEntryView;
import com.weiran.cqt.domain.account.Account;
import com.weiran.cqt.domain.account.AccountRepository;
import com.weiran.cqt.domain.account.CredentialType;
import com.weiran.cqt.domain.entry.EntryDetailRow;
import com.weiran.cqt.domain.entry.EntryRepository;
import com.weiran.framework.error.BizException;
import com.weiran.framework.error.CommonErrors;
import java.util.List;
import java.util.Objects;
import org.springframework.transaction.annotation.Transactional;

/** {@link MyEntriesService} 实现：账号按来源库 + 旧用户编号关联参赛人。 */
public class MyEntriesApplicationService implements MyEntriesService {

    private final AccountRepository accountRepository;

    private final EntryRepository entryRepository;

    /** 构造服务。 */
    public MyEntriesApplicationService(
            final AccountRepository accountRepository, final EntryRepository entryRepository) {
        this.accountRepository = accountRepository;
        this.entryRepository = entryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MyEntryView> list(final long accountId) {
        final Account account = this.requireAccount(accountId);
        return this.entryRepository.findByAccount(account.getSourceDatabase(), account.getLegacyUserId()).stream()
                .map(row -> new MyEntryView(
                        row.entryId(),
                        row.competitionId(),
                        row.competitionName(),
                        row.title(),
                        row.status(),
                        row.legacyStatus(),
                        row.firstCategoryLegacyId(),
                        row.secondCategoryLegacyId(),
                        row.regionLegacyId(),
                        row.attachmentUrl(),
                        row.teacherNames(),
                        row.createdAt(),
                        row.sourceDatabase(),
                        row.team(),
                        row.leaderName(),
                        row.leaderPhone()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EntryDetailView detail(final long accountId, final long entryId) {
        final Account account = this.requireAccount(accountId);
        if (!this.entryRepository.isParticipant(entryId, account.getSourceDatabase(), account.getLegacyUserId())) {
            throw new BizException(CommonErrors.FORBIDDEN, "无权查看该报名记录");
        }
        final EntryDetailRow row =
                this.entryRepository.findDetail(entryId).orElseThrow(() -> BizException.notFound("报名记录不存在"));
        final List<EntryDetailView.Member> members = this.entryRepository.findTeam(entryId).stream()
                .map(m -> new EntryDetailView.Member(
                        m.participantId(),
                        m.name(),
                        m.idCard(),
                        CredentialType.ofStored(m.credentialType()).label(),
                        m.phone(),
                        m.school(),
                        m.group(),
                        m.leader()))
                .toList();
        return new EntryDetailView(
                row.entryId(),
                row.entryNo(),
                row.competitionId(),
                row.competitionName(),
                row.stage(),
                row.firstCategoryLegacyId(),
                row.firstCategoryName(),
                row.secondCategoryLegacyId(),
                row.secondCategoryName(),
                row.regionLegacyId(),
                Objects.requireNonNullElse(row.regionName(), ""),
                row.legacySchoolId(),
                row.title(),
                row.description(),
                row.attachmentUrl(),
                row.attachmentName(),
                row.attachmentType(),
                row.teacherNames(),
                row.majorName(),
                row.groupName(),
                row.team(),
                row.status(),
                row.legacyStatus(),
                row.submittedAt(),
                row.createdAt(),
                row.progressMessage(),
                row.progressStep(),
                members);
    }

    private Account requireAccount(final long accountId) {
        return this.accountRepository.findById(accountId).orElseThrow(() -> BizException.notFound("当前用户不存在"));
    }
}
