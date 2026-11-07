package com.wulicode.weiran.system.application.batch;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.system.api.batch.BatchInputMode;
import com.wulicode.weiran.system.api.batch.BatchJobService;
import com.wulicode.weiran.system.api.batch.BatchJobView;
import com.wulicode.weiran.system.api.batch.BatchProcessor;
import com.wulicode.weiran.system.api.batch.BatchTaskDetailView;
import com.wulicode.weiran.system.domain.batch.BatchFileStorage;
import com.wulicode.weiran.system.domain.batch.BatchJob;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.annotation.Transactional;

/** 上传文件并建立持久化任务，查询始终按创建者隔离。 */
public class BatchJobApplicationService implements BatchJobService {

    private final BatchJobRepository jobs;
    private final BatchFileStorage files;
    private final List<BatchProcessor> processors;

    public BatchJobApplicationService(
            final BatchJobRepository jobs,
            final BatchFileStorage files,
            final ObjectProvider<BatchProcessor> processors) {
        this.jobs = jobs;
        this.files = files;
        this.processors = processors.orderedStream().toList();
    }

    @Override
    public BatchJobView create(
            final String kind, final String filename, final InputStream input, final long size, final long userId) {
        final BatchProcessor processor = this.processor(kind);
        if (processor.inputMode() != BatchInputMode.MANAGED_FILE) {
            throw BizException.badRequest("该处理类型使用业务引用输入");
        }
        if (size <= 0 || size > processor.maxBytes()) {
            throw BizException.badRequest("批处理文件超过该类型的大小限制");
        }
        processor.authorize(userId);
        final String safeName = filename.replace('\\', '/');
        final String basename = safeName.substring(safeName.lastIndexOf('/') + 1);
        if (basename.isBlank()
                || basename.length() > 255
                || !basename.toLowerCase(Locale.ROOT).endsWith("." + processor.extension())) {
            throw BizException.badRequest("文件名与批处理类型不匹配");
        }
        final String key = this.files.store(basename, input, size);
        try {
            final String fingerprint = BatchJobApplicationService.sha256(() -> this.files.open(key));
            final long id = this.jobs.create(kind, basename, key, "managed_file", fingerprint, userId);
            return this.get(id, userId);
        } catch (final RuntimeException ex) {
            this.files.delete(key);
            throw ex;
        }
    }

    @Override
    @Transactional
    public BatchJobView createReference(
            final String kind, final String name, final String reference, final long userId) {
        final BatchProcessor processor = this.processor(kind);
        if (processor.inputMode() != BatchInputMode.REFERENCE) {
            throw BizException.badRequest("该处理类型需要平台托管文件");
        }
        processor.authorize(userId);
        if (name.isBlank() || name.length() > 255 || reference.isBlank() || reference.length() > 255) {
            throw BizException.badRequest("批处理输入引用无效");
        }
        final String fingerprint;
        try {
            fingerprint = processor.referenceFingerprint(reference);
        } catch (final Exception ex) {
            throw BizException.badRequest("批处理输入引用不可用");
        }
        if (!fingerprint.matches("[a-fA-F0-9]{64}")) {
            throw BizException.badRequest("批处理输入指纹无效");
        }
        final long id =
                this.jobs.create(kind, name, reference, "reference", fingerprint.toLowerCase(Locale.ROOT), userId);
        return this.get(id, userId);
    }

    @Override
    @Transactional
    public BatchJobView createQueuedReference(
            final String kind, final String name, final String reference, final String fingerprint, final long userId) {
        if (userId <= 0
                || kind == null
                || !kind.matches("[A-Za-z0-9._-]{1,64}")
                || name == null
                || name.isBlank()
                || name.length() > 255
                || reference == null
                || reference.isBlank()
                || reference.length() > 255
                || fingerprint == null
                || !fingerprint.matches("[a-fA-F0-9]{64}")) {
            throw BizException.badRequest("批处理输入引用无效");
        }
        this.processors.stream()
                .filter(candidate -> candidate.kind().equals(kind))
                .findFirst()
                .ifPresent(processor -> {
                    if (processor.inputMode() != BatchInputMode.REFERENCE) {
                        throw BizException.badRequest("该处理类型需要平台托管文件");
                    }
                    processor.authorize(userId);
                    final String actualFingerprint;
                    try {
                        actualFingerprint = processor.referenceFingerprint(reference);
                    } catch (final Exception ex) {
                        throw BizException.badRequest("批处理输入引用不可用");
                    }
                    if (!fingerprint.equalsIgnoreCase(actualFingerprint)) {
                        throw BizException.badRequest("批处理输入指纹不一致");
                    }
                });
        final long id =
                this.jobs.createQueuedReference(kind, name, reference, fingerprint.toLowerCase(Locale.ROOT), userId);
        return this.get(id, userId);
    }

    @Override
    @Transactional
    public BatchJobView createQueuedExternalReference(
            final String userType,
            final long ownerId,
            final String kind,
            final String name,
            final String reference,
            final String fingerprint) {
        if (ownerId <= 0
                || userType == null
                || !userType.matches("[a-z][a-z0-9_-]{0,31}")
                || userType.equals("system")
                || kind == null
                || !kind.matches("[A-Za-z0-9._-]{1,64}")
                || name == null
                || name.isBlank()
                || name.length() > 255
                || reference == null
                || reference.isBlank()
                || reference.length() > 255
                || fingerprint == null
                || !fingerprint.matches("[a-fA-F0-9]{64}")) {
            throw BizException.badRequest("批处理输入引用无效");
        }
        this.processors.stream()
                .filter(candidate -> candidate.kind().equals(kind))
                .findFirst()
                .ifPresent(processor -> {
                    if (processor.inputMode() != BatchInputMode.REFERENCE) {
                        throw BizException.badRequest("该处理类型需要平台托管文件");
                    }
                    processor.authorizeExternal(userType, ownerId);
                    final String actualFingerprint;
                    try {
                        actualFingerprint = processor.referenceFingerprint(reference);
                    } catch (final Exception ex) {
                        throw BizException.badRequest("批处理输入引用不可用");
                    }
                    if (!fingerprint.equalsIgnoreCase(actualFingerprint)) {
                        throw BizException.badRequest("批处理输入指纹不一致");
                    }
                });
        final long id = this.jobs.createQueuedExternalReference(
                userType, ownerId, kind, name, reference, fingerprint.toLowerCase(Locale.ROOT));
        final BatchJob job = this.jobs.getExternal(id, userType, ownerId);
        if (job == null) {
            throw BizException.notFound("批处理任务不存在");
        }
        return this.view(job);
    }

    @Override
    public BatchJobView get(final long id, final long userId) {
        final BatchJob job = this.jobs.get(id, userId);
        if (job == null) {
            throw BizException.notFound("批处理任务不存在");
        }
        return this.view(job);
    }

    @Override
    public List<BatchJobView> recent(final long userId, final List<String> kinds) {
        if (kinds.size() > 20 || kinds.stream().anyMatch(kind -> !kind.matches("[A-Za-z0-9._-]{1,64}"))) {
            throw BizException.badRequest("批处理类型筛选无效");
        }
        return this.jobs.recent(userId, kinds.stream().distinct().toList()).stream()
                .map(this::view)
                .toList();
    }

    @Override
    public BatchJobView cancel(final long id, final long userId) {
        this.get(id, userId);
        this.jobs.requestCancel(id, userId);
        return this.get(id, userId);
    }

    @Override
    public PageResult<BatchTaskDetailView> details(
            final long id,
            final long userId,
            final @Nullable String stage,
            final @Nullable String status,
            final PageQuery page) {
        this.get(id, userId);
        if (stage != null && !stage.equals("validating") && !stage.equals("processing")) {
            throw BizException.badRequest("明细阶段无效");
        }
        if (status != null && !status.equals("pending") && !status.equals("succeeded") && !status.equals("failed")) {
            throw BizException.badRequest("明细状态无效");
        }
        return this.jobs
                .details(id, stage, status, page)
                .map(item -> new BatchTaskDetailView(
                        item.id(),
                        item.itemNo(),
                        item.itemName(),
                        item.stage(),
                        item.status(),
                        item.message(),
                        item.sourceLocation(),
                        item.idempotencyKey(),
                        item.displayData(),
                        item.resultType(),
                        item.resultId(),
                        item.createdAt()));
    }

    private BatchProcessor processor(final String kind) {
        return this.processors.stream()
                .filter(candidate -> candidate.kind().equals(kind))
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("不支持的批处理类型"));
    }

    static String sha256(final com.wulicode.weiran.system.api.batch.BatchSource source) {
        try (InputStream input = source.open()) {
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            final byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (final IOException | NoSuchAlgorithmException ex) {
            throw new IllegalStateException("批处理输入无法校验", ex);
        }
    }

    private BatchJobView view(final BatchJob job) {
        return new BatchJobView(
                job.id(),
                job.kind(),
                job.sourceName(),
                job.status(),
                job.phase(),
                job.total(),
                job.selectedCount(),
                job.processed(),
                job.succeeded(),
                job.failed(),
                job.errorMessage(),
                job.decidedAt(),
                job.createdAt(),
                job.finishedAt());
    }
}
