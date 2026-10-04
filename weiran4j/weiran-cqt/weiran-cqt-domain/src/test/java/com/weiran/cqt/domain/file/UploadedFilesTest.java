package com.weiran.cqt.domain.file;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.YearMonth;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UploadedFilesTest {

    @Test
    @DisplayName("扩展名：不区分大小写、去路径、不在白名单或无扩展名为空")
    void extension() {
        assertThat(UploadedFiles.extensionOf("作品.ZIP")).contains(".zip");
        assertThat(UploadedFiles.extensionOf("C:\\temp\\承诺书.Pdf")).contains(".pdf");
        assertThat(UploadedFiles.extensionOf("a/b/photo.jpeg")).contains(".jpeg");
        assertThat(UploadedFiles.extensionOf("virus.exe")).isEmpty();
        assertThat(UploadedFiles.extensionOf("noext")).isEmpty();
        assertThat(UploadedFiles.extensionOf(".zip")).isEmpty();
        assertThat(UploadedFiles.extensionOf("trailing.")).isEmpty();
        assertThat(UploadedFiles.extensionOf(null)).isEmpty();
    }

    @Test
    @DisplayName("对象名：前缀 + user_files/账号/年月/UUID(无横线) + 扩展名")
    void objectName() {
        final UUID id = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

        assertThat(UploadedFiles.objectName("cqt/", 42L, YearMonth.of(2026, 3), id, ".zip"))
                .isEqualTo("cqt/user_files/42/202603/123e4567e89b12d3a456426614174000.zip");
        assertThat(UploadedFiles.objectName("", 7L, YearMonth.of(2026, 10), id, ".pdf"))
                .startsWith("user_files/7/202610/");
    }
}
