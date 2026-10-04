package com.weiran.cqt.infrastructure.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.cqt.domain.file.FileStorageException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalFileStorageTest {

    @TempDir
    Path root;

    @Test
    @DisplayName("写入 <root>/<对象名>，返回 <前缀>/<对象名>")
    void storesUnderRoot() throws IOException {
        final LocalFileStorage storage = new LocalFileStorage(this.root, "/uploads/");

        final String url = storage.store(
                "cqt/user_files/1/202610/a.pdf",
                new ByteArrayInputStream("pdf".getBytes(StandardCharsets.UTF_8)),
                3,
                "application/pdf");

        assertThat(url).isEqualTo("/uploads/cqt/user_files/1/202610/a.pdf");
        assertThat(Files.readString(this.root.resolve("cqt/user_files/1/202610/a.pdf")))
                .isEqualTo("pdf");
        assertThat(storage.root()).isEqualTo(this.root.toAbsolutePath().normalize());
    }

    @Test
    @DisplayName("对象名越出根目录 → FileStorageException")
    void rejectsTraversal() {
        final LocalFileStorage storage = new LocalFileStorage(this.root, "/uploads");

        assertThatThrownBy(() -> storage.store("../evil.zip", new ByteArrayInputStream(new byte[1]), 1, null))
                .isInstanceOf(FileStorageException.class);
    }
}
