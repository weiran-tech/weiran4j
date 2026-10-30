package com.wulicode.weiran.system.application.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.api.media.CompleteDirectUploadRequest;
import com.wulicode.weiran.system.domain.media.MediaRepository;
import com.wulicode.weiran.system.domain.storage.DirectUploadStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage.StoredFile;
import com.wulicode.weiran.system.domain.storage.FileStorageException;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MediaApplicationServiceTest {

    @Test
    @DisplayName("直传文件按对象真实大小与文件头验收后登记")
    void registersInspectedDirectUpload() {
        final MediaRepository mediaRepository = mock(MediaRepository.class);
        final FileStorage storage = mock(FileStorage.class, withSettings().extraInterfaces(DirectUploadStorage.class));
        final DirectUploadStorage direct = (DirectUploadStorage) storage;
        final String key = "media/202610/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png";
        when(direct.inspect(key, "ticket", 1L))
                .thenReturn(new DirectUploadStorage.InspectedFile(
                        new StoredFile("https://cdn.example.com/" + key, key, 8),
                        new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}));
        final MediaApplicationService service =
                new MediaApplicationService(mediaRepository, storage, new MediaAssetDeletionService(mediaRepository));

        final var result =
                service.completeDirectUpload(new CompleteDirectUploadRequest("cover.png", key, 8, "ticket"), 1L);

        assertThat(result.url()).isEqualTo("https://cdn.example.com/" + key);
        verify(mediaRepository)
                .save(org.mockito.ArgumentMatchers.argThat(
                        asset -> asset.objectName().equals(key) && asset.uploadedBy() == 1L && asset.size() == 8));
        assertThatThrownBy(() -> service.completeDirectUpload(
                        new CompleteDirectUploadRequest("cover.png", key, 9, "ticket"), 1L))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("大小不匹配");
    }

    @Test
    @DisplayName("存储未配置时上传返回 503")
    void returnsServiceUnavailableWhenStorageIsDisabled() {
        final MediaRepository mediaRepository = mock(MediaRepository.class);
        final FileStorage fileStorage = mock(FileStorage.class);
        when(fileStorage.store(
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.anyLong()))
                .thenThrow(new FileStorageException("文件存储未配置"));
        final MediaApplicationService service = new MediaApplicationService(
                mediaRepository, fileStorage, new MediaAssetDeletionService(mediaRepository));

        assertThatThrownBy(() -> service.upload(
                        "image.png",
                        new ByteArrayInputStream(new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}),
                        8,
                        1L))
                .isInstanceOf(BizException.class)
                .satisfies(exception -> assertThat(
                                ((BizException) exception).getErrorCode().code())
                        .isEqualTo(100006));
    }
}
