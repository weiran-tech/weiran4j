package com.wulicode.weiran.demo.batch;

import com.wulicode.weiran.system.api.batch.BatchFileException;
import com.wulicode.weiran.system.api.batch.BatchItemResult;
import com.wulicode.weiran.system.api.batch.BatchProcessor;
import com.wulicode.weiran.system.api.batch.BatchSource;
import com.wulicode.weiran.system.api.batch.BatchValidationItem;
import com.wulicode.weiran.system.api.batch.BatchValidationSink;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.jspecify.annotations.Nullable;

/** ZIP 演示：预检所有文件，入库时按稳定文件序号重读输入。 */
public class DemoZipBatchProcessor implements BatchProcessor {

    private static final long MAX_ENTRY_BYTES = 10L * 1024 * 1024;
    private static final long MAX_EXPANDED_BYTES = 200L * 1024 * 1024;
    private static final int MAX_ENTRIES = 1_000;
    private static final Set<String> ALLOWED =
            Set.of("txt", "csv", "pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "ppt", "pptx");
    private final DemoBatchItemStore items;

    public DemoZipBatchProcessor(final DemoBatchItemStore items) {
        this.items = items;
    }

    @Override
    public String kind() {
        return "demo_zip";
    }

    @Override
    public String extension() {
        return "zip";
    }

    @Override
    public void authorize(final long userId) {
        // local/test 演示，仅需入口已有的 system:batch-job:create 权限。
    }

    @Override
    public void precheck(final BatchSource source, final BatchValidationSink sink) throws Exception {
        this.scan(
                source,
                (number, name, hash, error) -> sink.accept(new BatchValidationItem(
                        number, name, "ZIP: " + name, String.valueOf(number), error == null, error, null)));
    }

    @Override
    public BatchItemResult processItem(
            final BatchSource source, final long taskId, final long itemNo, final String idempotencyKey)
            throws Exception {
        if (!idempotencyKey.equals(String.valueOf(itemNo))) {
            throw new BatchFileException("ZIP 处理项键已变化");
        }
        final boolean[] found = {false};
        this.scan(source, (number, name, hash, error) -> {
            if (number != itemNo) {
                return;
            }
            found[0] = true;
            if (error != null) {
                throw new BatchFileException(error);
            }
            this.items.save(taskId, number, name, hash);
        });
        if (!found[0]) {
            throw new BatchFileException("ZIP 处理项已失效");
        }
        return BatchItemResult.withoutReference();
    }

    private void scan(final BatchSource source, final EntryConsumer consumer) throws Exception {
        long count = 0;
        long expanded = 0;
        try (InputStream input = source.open();
                ZipInputStream zip = new ZipInputStream(input)) {
            ZipEntry entry;
            final byte[] buffer = new byte[8192];
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    zip.closeEntry();
                    continue;
                }
                final String name = entry.getName().replace('\\', '/');
                if (++count > DemoZipBatchProcessor.MAX_ENTRIES) {
                    throw new BatchFileException("ZIP 文件数量超过限制");
                }
                final MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long bytes = 0;
                int read;
                while ((read = zip.read(buffer)) != -1) {
                    bytes += read;
                    expanded += read;
                    if (bytes > DemoZipBatchProcessor.MAX_ENTRY_BYTES
                            || expanded > DemoZipBatchProcessor.MAX_EXPANDED_BYTES) {
                        throw new BatchFileException("ZIP 解压后大小超过限制");
                    }
                    digest.update(buffer, 0, read);
                }
                if (entry.getCompressedSize() > 0 && bytes / entry.getCompressedSize() > 100) {
                    throw new BatchFileException("ZIP 压缩比超过限制");
                }
                zip.closeEntry();
                final String suffix = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
                final String error;
                if (name.startsWith("/")
                        || name.matches("^[A-Za-z]:.*")
                        || name.equals("..")
                        || name.endsWith("/..")
                        || name.contains("../")
                        || name.contains("\u0000")) {
                    error = "ZIP 包含无效路径";
                } else if (!DemoZipBatchProcessor.ALLOWED.contains(suffix)) {
                    error = "不支持的 ZIP 内文件类型";
                } else if (name.length() > 255) {
                    error = "文件路径超过 255 个字符";
                } else {
                    error = null;
                }
                consumer.accept(
                        count,
                        name.length() > 255 ? name.substring(0, 255) : name,
                        HexFormat.of().formatHex(digest.digest()),
                        error);
            }
        }
        if (count == 0) {
            throw new BatchFileException("ZIP 没有文件");
        }
    }

    @FunctionalInterface
    private interface EntryConsumer {
        void accept(long number, String name, String hash, @Nullable String error);
    }
}
