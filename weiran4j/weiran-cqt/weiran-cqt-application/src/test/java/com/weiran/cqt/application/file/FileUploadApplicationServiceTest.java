package com.weiran.cqt.application.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.api.file.UploadedFileView;
import com.weiran.cqt.domain.file.FileStorage;
import com.weiran.cqt.domain.file.FileStorageException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

class FileUploadApplicationServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-05T00:00:00Z"), ZoneOffset.UTC);

    private static final byte[] CONTENT = "hello-upload".getBytes(StandardCharsets.UTF_8);

    /** 记录写入内容的假存储。 */
    private static final class RecordingStorage implements FileStorage {

        private @Nullable String objectName;

        private @Nullable String body;

        private final boolean fail;

        RecordingStorage(final boolean fail) {
            this.fail = fail;
        }

        @Override
        public String store(
                final String objectName,
                final InputStream content,
                final long size,
                final @Nullable String contentType) {
            if (this.fail) {
                throw new FileStorageException("boom", new IllegalStateException("x"));
            }
            this.objectName = objectName;
            try {
                this.body = new String(content.readAllBytes(), StandardCharsets.UTF_8);
            } catch (final IOException ex) {
                throw new UncheckedIOException(ex);
            }
            return "https://cdn.example.com/" + objectName;
        }

        @Override
        public boolean isStoredUrl(final String url) {
            return url.startsWith("https://cdn.example.com/");
        }
    }

    private static FileUploadApplicationService service(final FileStorage... storages) {
        final StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int i = 0; i < storages.length; i++) {
            factory.addBean("storage" + i, storages[i]);
        }
        return new FileUploadApplicationService(
                factory.getBeanProvider(FileStorage.class), FileUploadApplicationServiceTest.CLOCK, "cqt/");
    }

    private static UploadedFileView upload(
            final FileUploadApplicationService service, final @Nullable String name, final long size) {
        return service.upload(
                42L,
                name,
                size,
                () -> new ByteArrayInputStream(FileUploadApplicationServiceTest.CONTENT),
                "application/zip");
    }

    @Test
    @DisplayName("成功：对象名带账号与年月，返回地址、去路径的原始名、对象名与大小，内容原样写入")
    void uploads() {
        final RecordingStorage storage = new RecordingStorage(false);

        final UploadedFileView view = FileUploadApplicationServiceTest.upload(
                FileUploadApplicationServiceTest.service(storage),
                "dir/作品.ZIP",
                FileUploadApplicationServiceTest.CONTENT.length);

        assertThat(view.path()).startsWith("cqt/user_files/42/202610/").endsWith(".zip");
        assertThat(view.url()).isEqualTo("https://cdn.example.com/" + view.path());
        assertThat(view.name()).isEqualTo("作品.ZIP");
        assertThat(view.size()).isEqualTo(FileUploadApplicationServiceTest.CONTENT.length);
        assertThat(storage.objectName).isEqualTo(view.path());
        assertThat(storage.body).isEqualTo("hello-upload");
    }

    @Test
    @DisplayName("空文件 / 无文件名 → 请选择文件；类型不在白名单 → 不支持的文件类型")
    void validates() {
        final FileUploadApplicationService service =
                FileUploadApplicationServiceTest.service(new RecordingStorage(false));

        assertThatThrownBy(() -> FileUploadApplicationServiceTest.upload(service, "a.zip", 0))
                .hasMessage("请选择文件");
        assertThatThrownBy(() -> FileUploadApplicationServiceTest.upload(service, null, 10))
                .hasMessage("请选择文件");
        assertThatThrownBy(() -> FileUploadApplicationServiceTest.upload(service, "virus.exe", 10))
                .hasMessage("不支持的文件类型");
    }

    @Test
    @DisplayName("未配置存储 → 50322；存储写入失败 → 50323")
    void storageErrors() {
        assertThatThrownBy(() -> FileUploadApplicationServiceTest.upload(
                        FileUploadApplicationServiceTest.service(), "a.zip", 10))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CqtErrors.STORAGE_NOT_CONFIGURED));
        assertThatThrownBy(() -> FileUploadApplicationServiceTest.upload(
                        FileUploadApplicationServiceTest.service(new RecordingStorage(true)), "a.zip", 10))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CqtErrors.UPLOAD_FAILED));
    }
}
