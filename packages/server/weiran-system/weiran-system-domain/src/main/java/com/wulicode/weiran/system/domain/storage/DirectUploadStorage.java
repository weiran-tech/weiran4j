package com.wulicode.weiran.system.domain.storage;

import java.time.Instant;

/** 浏览器直传对象存储的授权和验收端口。 */
public interface DirectUploadStorage {

    Authorization authorize(long userId);

    InspectedFile inspect(String objectName, String ticket, long userId);

    record Authorization(
            String uploadUrl,
            String keyPrefix,
            String accessKeyId,
            String policy,
            String signature,
            Instant expiresAt,
            String ticket) {}

    final class InspectedFile {
        private final FileStorage.StoredFile stored;
        private final byte[] header;

        public InspectedFile(final FileStorage.StoredFile stored, final byte[] header) {
            this.stored = stored;
            this.header = header.clone();
        }

        public FileStorage.StoredFile stored() {
            return this.stored;
        }

        public byte[] header() {
            return this.header.clone();
        }
    }
}
