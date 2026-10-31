package com.wulicode.weiran.system.application.media;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.platform.api.config.ConfigService;
import com.wulicode.weiran.platform.api.config.ConfigView;
import com.wulicode.weiran.system.api.media.CompleteDirectUploadRequest;
import com.wulicode.weiran.system.api.media.DirectUploadView;
import com.wulicode.weiran.system.api.media.FileUploadView;
import com.wulicode.weiran.system.api.media.MediaReferenceChecker;
import com.wulicode.weiran.system.api.media.MediaReferenceLocation;
import com.wulicode.weiran.system.api.media.MediaService;
import com.wulicode.weiran.system.api.media.MediaUploadSettingsView;
import com.wulicode.weiran.system.api.media.MediaView;
import com.wulicode.weiran.system.domain.media.MediaAsset;
import com.wulicode.weiran.system.domain.media.MediaFileTypes;
import com.wulicode.weiran.system.domain.media.MediaReferenceRepository;
import com.wulicode.weiran.system.domain.media.MediaRepository;
import com.wulicode.weiran.system.domain.media.MediaUploadPolicy;
import com.wulicode.weiran.system.domain.storage.DirectUploadStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage.StoredFile;
import com.wulicode.weiran.system.domain.storage.FileStorageException;
import java.io.IOException;
import java.io.InputStream;
import java.io.PushbackInputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 文件上传、查询和引用保护删除用例。 */
public class MediaApplicationService implements MediaService {

    private final MediaRepository mediaRepository;
    private final FileStorage fileStorage;
    private final MediaAssetDeletionService deletionService;
    private final @Nullable MediaReferenceRepository referenceRepository;
    private final List<MediaReferenceChecker> referenceCheckers;
    private final @Nullable ConfigService configService;

    @Autowired
    public MediaApplicationService(
            final MediaRepository mediaRepository,
            final FileStorage fileStorage,
            final MediaAssetDeletionService deletionService,
            final MediaReferenceRepository referenceRepository,
            final List<MediaReferenceChecker> referenceCheckers,
            final ConfigService configService) {
        this.mediaRepository = mediaRepository;
        this.fileStorage = fileStorage;
        this.deletionService = deletionService;
        this.referenceRepository = referenceRepository;
        this.referenceCheckers = List.copyOf(referenceCheckers);
        this.configService = configService;
    }

    /** 供无需配置仓储的轻量使用者使用。 */
    public MediaApplicationService(
            final MediaRepository mediaRepository,
            final FileStorage fileStorage,
            final MediaAssetDeletionService deletionService) {
        this.mediaRepository = mediaRepository;
        this.fileStorage = fileStorage;
        this.deletionService = deletionService;
        this.referenceRepository = null;
        this.referenceCheckers = List.of();
        this.configService = null;
    }

    @Override
    @Transactional(readOnly = true)
    public MediaUploadSettingsView uploadSettings() {
        final MediaUploadPolicy policy = this.uploadPolicy();
        return new MediaUploadSettingsView(
                policy.imageFormats(),
                policy.imageMaxSizeMb(),
                policy.videoFormats(),
                policy.videoMaxSizeMb(),
                policy.fileFormats(),
                policy.fileMaxSizeMb());
    }

    private MediaUploadPolicy uploadPolicy() {
        if (this.configService == null) {
            return MediaUploadPolicy.defaults();
        }
        final Map<String, String> values = this.configService.all().stream()
                .collect(Collectors.toMap(ConfigView::configKey, ConfigView::configValue, (first, ignored) -> first));
        return MediaUploadPolicy.from(values);
    }

    @Override
    public @Nullable DirectUploadView directUploadAuthorization(final long userId) {
        if (!(this.fileStorage instanceof DirectUploadStorage direct)) {
            return null;
        }
        final DirectUploadStorage.Authorization auth = direct.authorize(userId);
        return new DirectUploadView(
                auth.uploadUrl(),
                auth.keyPrefix(),
                auth.accessKeyId(),
                auth.policy(),
                auth.signature(),
                auth.expiresAt(),
                auth.ticket());
    }

    @Override
    @Transactional
    public FileUploadView completeDirectUpload(final CompleteDirectUploadRequest request, final long userId) {
        if (!(this.fileStorage instanceof DirectUploadStorage direct)) {
            throw BizException.badRequest("当前存储不支持浏览器直传");
        }
        if (request == null
                || request.originalName() == null
                || request.objectName() == null
                || request.ticket() == null) {
            throw BizException.badRequest("上传信息不完整");
        }
        final String extension = MediaFileTypes.extension(request.originalName());
        try {
            this.uploadPolicy().validate(extension, request.size());
            if (!extension.equals(MediaFileTypes.extension(request.objectName()))) {
                throw BizException.badRequest("上传文件类型不匹配");
            }
            final DirectUploadStorage.InspectedFile inspected =
                    direct.inspect(request.objectName(), request.ticket(), userId);
            final StoredFile stored = inspected.stored();
            if (stored.size() != request.size()) {
                throw BizException.badRequest("上传文件大小不匹配");
            }
            if (MediaFileTypes.image(extension)
                    && !MediaApplicationService.matchesImageSignature(extension, inspected.header())) {
                throw BizException.badRequest("图片文件内容与扩展名不匹配");
            }
            if (MediaFileTypes.video(extension)
                    && !MediaApplicationService.matchesVideoSignature(extension, inspected.header())) {
                throw BizException.badRequest("视频文件内容与扩展名不匹配");
            }
            this.mediaRepository.save(new MediaAsset(
                    0L,
                    request.originalName(),
                    stored.url(),
                    stored.objectName(),
                    stored.size(),
                    userId,
                    Instant.now()));
            return new FileUploadView(stored.url(), request.originalName(), stored.objectName(), stored.size());
        } catch (final IllegalArgumentException ex) {
            throw BizException.badRequest(ex.getMessage() == null ? "上传对象无效" : ex.getMessage());
        } catch (final FileStorageException ex) {
            throw new BizException(com.wulicode.weiran.framework.error.CommonErrors.INTERNAL_ERROR, "上传对象校验失败");
        }
    }

    @Override
    @Transactional
    public FileUploadView upload(
            final String originalName, final InputStream content, final long size, final long uploadedBy)
            throws IOException {
        final StoredFile stored;
        try (PushbackInputStream checked = new PushbackInputStream(content, 12)) {
            final String extension = MediaFileTypes.extension(originalName);
            this.uploadPolicy().validate(extension, size);
            final byte[] header = checked.readNBytes(12);
            checked.unread(header);
            if (MediaFileTypes.image(extension) && !MediaApplicationService.matchesImageSignature(extension, header)) {
                throw BizException.badRequest("图片文件内容与扩展名不匹配");
            }
            if (MediaFileTypes.video(extension) && !MediaApplicationService.matchesVideoSignature(extension, header)) {
                throw BizException.badRequest("视频文件内容与扩展名不匹配");
            }
            stored = this.fileStorage.store(originalName, checked, size);
        } catch (final IOException | RuntimeException ex) {
            if (ex instanceof BizException businessException) {
                throw businessException;
            }
            if (ex instanceof FileStorageException storageException) {
                if ("文件存储未配置".equals(storageException.getMessage())) {
                    throw BizException.serviceUnavailable("文件存储未配置");
                }
                throw new BizException(com.wulicode.weiran.framework.error.CommonErrors.INTERNAL_ERROR, "文件上传失败，请稍后重试");
            }
            throw new BizException(com.wulicode.weiran.framework.error.CommonErrors.INTERNAL_ERROR, ex);
        }
        try {
            this.mediaRepository.save(new MediaAsset(
                    0L, originalName, stored.url(), stored.objectName(), stored.size(), uploadedBy, Instant.now()));
        } catch (final RuntimeException ex) {
            try {
                this.fileStorage.delete(stored.objectName());
            } catch (final RuntimeException cleanupFailure) {
                ex.addSuppressed(cleanupFailure);
            }
            throw ex;
        }
        return new FileUploadView(stored.url(), originalName, stored.objectName(), stored.size());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<MediaView> page(
            final @Nullable String keyword, final @Nullable String category, final PageQuery pageQuery) {
        final PageResult<MediaAsset> result = this.mediaRepository.page(keyword, category, pageQuery);
        final Map<String, List<String>> references =
                this.references(result.list().stream().map(MediaAsset::url).toList());
        return new PageResult<>(
                result.list().stream()
                        .map(asset -> MediaApplicationService.toView(asset, references))
                        .toList(),
                result.total(),
                result.page(),
                result.pageSize());
    }

    @Override
    @Transactional
    public void delete(final long id) {
        final MediaAsset asset = this.mediaRepository.findById(id).orElseThrow(() -> BizException.notFound("文件不存在"));
        if (!this.references(List.of(asset.url()))
                .getOrDefault(asset.url(), List.of())
                .isEmpty()) {
            throw BizException.conflict("文件仍被使用，请先移除引用");
        }
        if (this.referenceRepository != null && !this.referenceRepository.claimDeletion(id)) {
            throw BizException.conflict("文件仍被使用，请先移除引用");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                MediaApplicationService.this.fileStorage.delete(asset.objectName());
                MediaApplicationService.this.deletionService.deleteRecord(id);
            }
        });
    }

    private static MediaView toView(final MediaAsset asset, final Map<String, List<String>> references) {
        return new MediaView(
                asset.id(),
                asset.originalName(),
                asset.url(),
                asset.size(),
                asset.createdAt(),
                MediaFileTypes.category(asset.originalName()),
                references.getOrDefault(asset.url(), List.of()));
    }

    private Map<String, List<String>> references(final List<String> urls) {
        if (urls.isEmpty()) {
            return Map.of();
        }
        final List<MediaReferenceLocation> locations = new java.util.ArrayList<>();
        if (this.referenceRepository != null) {
            this.referenceRepository
                    .findReferences(urls)
                    .forEach(reference -> locations.add(new MediaReferenceLocation(
                            reference.url(),
                            reference.sourceType(),
                            reference.sourceId(),
                            reference.field(),
                            reference.label())));
        }
        for (final MediaReferenceChecker checker : this.referenceCheckers) {
            locations.addAll(checker.findReferences(urls));
        }
        return locations.stream()
                .collect(Collectors.groupingBy(
                        MediaReferenceLocation::url,
                        Collectors.mapping(
                                MediaReferenceLocation::label,
                                Collectors.collectingAndThen(
                                        Collectors.toCollection(java.util.LinkedHashSet::new), List::copyOf))));
    }

    private static boolean matchesImageSignature(final String extension, final byte[] header) {
        return switch (extension) {
            case "jpg", "jpeg" ->
                header.length >= 3 && header[0] == (byte) 0xff && header[1] == (byte) 0xd8 && header[2] == (byte) 0xff;
            case "png" ->
                header.length >= 8
                        && header[0] == (byte) 0x89
                        && header[1] == 0x50
                        && header[2] == 0x4e
                        && header[3] == 0x47
                        && header[4] == 0x0d
                        && header[5] == 0x0a
                        && header[6] == 0x1a
                        && header[7] == 0x0a;
            case "gif" ->
                header.length >= 6
                        && header[0] == 'G'
                        && header[1] == 'I'
                        && header[2] == 'F'
                        && header[3] == '8'
                        && (header[4] == '7' || header[4] == '9')
                        && header[5] == 'a';
            case "webp" ->
                header.length >= 12
                        && header[0] == 'R'
                        && header[1] == 'I'
                        && header[2] == 'F'
                        && header[3] == 'F'
                        && header[8] == 'W'
                        && header[9] == 'E'
                        && header[10] == 'B'
                        && header[11] == 'P';
            default -> false;
        };
    }

    private static boolean matchesVideoSignature(final String extension, final byte[] header) {
        return switch (extension) {
            case "mp4", "mov" ->
                header.length >= 8 && header[4] == 'f' && header[5] == 't' && header[6] == 'y' && header[7] == 'p';
            case "webm" ->
                header.length >= 4
                        && header[0] == 0x1a
                        && header[1] == 0x45
                        && header[2] == (byte) 0xdf
                        && header[3] == (byte) 0xa3;
            default -> false;
        };
    }
}
