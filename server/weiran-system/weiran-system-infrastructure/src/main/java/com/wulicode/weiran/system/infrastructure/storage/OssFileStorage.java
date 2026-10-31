package com.wulicode.weiran.system.infrastructure.storage;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.GetObjectRequest;
import com.aliyun.oss.model.OSSObject;
import com.aliyun.oss.model.ObjectMetadata;
import com.wulicode.weiran.system.domain.media.MediaFileTypes;
import com.wulicode.weiran.system.domain.storage.DirectUploadStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage.StoredFile;
import com.wulicode.weiran.system.domain.storage.FileStorageException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** 阿里云 OSS 文件存储。 */
public final class OssFileStorage implements FileStorage, DirectUploadStorage, AutoCloseable {

    private static final long MAX_DIRECT_SIZE = 1024L * 1024 * 1024;

    private final SystemStorageProperties.Aliyun properties;
    private final OSS client;
    private final String publicBaseUrl;

    public OssFileStorage(final SystemStorageProperties.Aliyun properties) {
        this.properties = properties;
        this.publicBaseUrl = OssFileStorage.trimSlash(properties.publicBaseUrl());
        this.client = new OSSClientBuilder()
                .build(properties.endpoint(), properties.accessKeyId(), properties.accessKeySecret());
    }

    @Override
    public StoredFile store(final String originalName, final InputStream input, final long size, final long userId) {
        final String objectName = MediaObjectNames.newUserObjectName(originalName, userId, java.time.Clock.systemUTC());
        final ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(size);
        final String extension = MediaFileTypes.extension(originalName);
        metadata.setContentType(MediaFileTypes.contentType(extension));
        if (!MediaFileTypes.image(extension)
                && !MediaFileTypes.video(extension)
                && !extension.equals("pdf")
                && !extension.equals("txt")) {
            metadata.setContentDisposition("attachment");
        }
        try {
            this.client.putObject(this.properties.bucket(), objectName, input, metadata);
        } catch (final RuntimeException ex) {
            throw new FileStorageException("文件上传失败，请稍后重试", ex);
        }
        return new StoredFile(this.publicBaseUrl + "/" + objectName, objectName, size);
    }

    @Override
    public Authorization authorize(final long userId) {
        final Instant now = Instant.now();
        final Instant expiresAt = now.plusSeconds(15 * 60);
        final String prefix = MediaObjectNames.userPrefix(userId, java.time.Clock.systemUTC());
        final String policyJson = "{\"expiration\":\"" + expiresAt + "\",\"conditions\":["
                + "{\"bucket\":\"" + this.properties.bucket() + "\"},"
                + "[\"starts-with\",\"$key\",\"" + prefix + "\"],"
                + "[\"content-length-range\",1," + OssFileStorage.MAX_DIRECT_SIZE + "],"
                + "[\"eq\",\"$success_action_status\",\"204\"],"
                + "[\"eq\",\"$x-oss-forbid-overwrite\",\"true\"]]}";
        final String policy = Base64.getEncoder().encodeToString(policyJson.getBytes(StandardCharsets.UTF_8));
        final String payload =
                prefix + "|" + userId + "|" + now.plusSeconds(2 * 60 * 60).getEpochSecond();
        final String ticket =
                Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "."
                        + OssFileStorage.signTicket(payload, this.properties.accessKeySecret());
        final String endpoint =
                this.properties.endpoint().replaceFirst("^https?://", "").replaceFirst("/$", "");
        return new Authorization(
                "https://" + this.properties.bucket() + "." + endpoint,
                prefix,
                this.properties.accessKeyId(),
                policy,
                this.client.calculatePostSignature(policyJson),
                expiresAt,
                ticket);
    }

    @Override
    public InspectedFile inspect(final String objectName, final String ticket, final long userId) {
        if (!MediaObjectNames.validDirectKey(objectName) || ticket == null) {
            throw new IllegalArgumentException("上传对象无效");
        }
        final String[] parts = ticket.split("\\.", -1);
        if (parts.length != 2) {
            throw new IllegalArgumentException("上传授权无效");
        }
        final String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
        } catch (final IllegalArgumentException ex) {
            throw new IllegalArgumentException("上传授权无效", ex);
        }
        final String expected = OssFileStorage.signTicket(payload, this.properties.accessKeySecret());
        if (!MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.US_ASCII), parts[1].getBytes(StandardCharsets.US_ASCII))) {
            throw new IllegalArgumentException("上传授权无效");
        }
        final String[] claims = payload.split("\\|", -1);
        if (claims.length != 3 || !objectName.startsWith(claims[0]) || !claims[1].equals(Long.toString(userId))) {
            throw new IllegalArgumentException("上传对象不属于当前用户");
        }
        try {
            if (Instant.now().getEpochSecond() > Long.parseLong(claims[2])) {
                throw new IllegalArgumentException("上传授权已过期");
            }
        } catch (final NumberFormatException ex) {
            throw new IllegalArgumentException("上传授权无效", ex);
        }
        try {
            final ObjectMetadata metadata = this.client.getObjectMetadata(this.properties.bucket(), objectName);
            final long size = metadata.getContentLength();
            if (size <= 0 || size > OssFileStorage.MAX_DIRECT_SIZE) {
                throw new IllegalArgumentException("上传文件大小无效");
            }
            final GetObjectRequest request =
                    new GetObjectRequest(this.properties.bucket(), objectName).withRange(0, 11);
            try (OSSObject object = this.client.getObject(request)) {
                final byte[] header = object.getObjectContent().readNBytes(12);
                return new InspectedFile(
                        new StoredFile(this.publicBaseUrl + "/" + objectName, objectName, size), header);
            }
        } catch (final IOException | RuntimeException ex) {
            if (ex instanceof IllegalArgumentException badRequest) {
                throw badRequest;
            }
            throw new FileStorageException("上传对象校验失败", ex);
        }
    }

    private static String signTicket(final String payload, final String secret) {
        try {
            final Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(mac.doFinal(("direct-upload:" + payload).getBytes(StandardCharsets.UTF_8)));
        } catch (final NoSuchAlgorithmException | java.security.InvalidKeyException ex) {
            throw new IllegalStateException("上传授权签名失败", ex);
        }
    }

    @Override
    public void delete(final String objectName) {
        if (!MediaObjectNames.validStoredKey(objectName)) {
            throw new IllegalArgumentException("文件对象名无效");
        }
        try {
            this.client.deleteObject(this.properties.bucket(), objectName);
        } catch (final RuntimeException ex) {
            throw new FileStorageException("文件删除失败，请稍后重试", ex);
        }
    }

    @Override
    public void close() {
        this.client.shutdown();
    }

    private static String trimSlash(final String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
