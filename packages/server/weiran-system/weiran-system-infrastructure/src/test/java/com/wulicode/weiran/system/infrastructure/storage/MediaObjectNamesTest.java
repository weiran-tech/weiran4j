package com.wulicode.weiran.system.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MediaObjectNamesTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-31T23:05:00Z"), ZoneOffset.UTC);

    @Test
    @DisplayName("用户路径使用稳定的小写 Hashids 标识和 UTC 日期")
    void namesUserFiles() {
        final String prefix = MediaObjectNames.userPrefix(7L, MediaObjectNamesTest.CLOCK);
        final String objectName = MediaObjectNames.newUserObjectName("Photo.PNG", 7L, MediaObjectNamesTest.CLOCK);

        assertThat(prefix).matches("media/u/[a-z0-9]{8,}/20261031/");
        assertThat(prefix).isEqualTo(MediaObjectNames.userPrefix(7L, MediaObjectNamesTest.CLOCK));
        assertThat(objectName).startsWith(prefix).matches("media/u/[a-z0-9]{8,}/20261031/[0-9a-f-]{36}\\.png");
        assertThat(MediaObjectNames.validDirectKey(objectName)).isTrue();
    }

    @Test
    @DisplayName("未授权路径只按月日分层，且旧对象仍可删除")
    void namesAnonymousFilesAndAcceptsLegacyKeys() {
        assertThat(MediaObjectNames.anonymousPrefix(MediaObjectNamesTest.CLOCK)).isEqualTo("media/n/202610/31/");
        assertThat(MediaObjectNames.validStoredKey("media/n/202610/31/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf"))
                .isTrue();
        assertThat(MediaObjectNames.validStoredKey("media/202610/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png"))
                .isTrue();
        assertThat(MediaObjectNames.validStoredKey(
                        "media/202610/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png"))
                .isTrue();
        assertThat(MediaObjectNames.validStoredKey("media/u/123/20261031/../../bad.png"))
                .isFalse();
    }
}
