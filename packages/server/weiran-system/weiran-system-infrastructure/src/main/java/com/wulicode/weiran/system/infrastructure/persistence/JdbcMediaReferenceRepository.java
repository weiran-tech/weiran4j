package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.domain.media.MediaReference;
import com.wulicode.weiran.system.domain.media.MediaReferenceRepository;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;

/** 资源引用索引。引用写入和资源删除都锁住同一条 sys_media 记录。 */
public class JdbcMediaReferenceRepository implements MediaReferenceRepository {

    private final JdbcTemplate jdbc;

    public JdbcMediaReferenceRepository(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void replace(
            final String sourceType,
            final String sourceId,
            final String field,
            final String label,
            final Collection<String> urls) {
        final List<String> distinctUrls = urls.stream()
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .toList();
        final List<Long> oldIds = this.jdbc.queryForList(
                "select media_id from sys_media_reference where source_type = ? and source_id = ? and field_key = ?",
                Long.class,
                sourceType,
                sourceId,
                field);
        final Map<String, Long> found = new LinkedHashMap<>();
        if (!distinctUrls.isEmpty()) {
            final String placeholders = JdbcMediaReferenceRepository.placeholders(distinctUrls.size());
            final List<Map.Entry<String, Long>> rows = this.jdbc.query(
                    "select id, url from sys_media where url in (" + placeholders + ")",
                    (row, index) -> Map.entry(row.getString("url"), row.getLong("id")),
                    distinctUrls.toArray());
            rows.forEach(entry -> found.put(entry.getKey(), entry.getValue()));
        }
        final List<Long> ids = java.util.stream.Stream.concat(oldIds.stream(), found.values().stream())
                .distinct()
                .sorted()
                .toList();
        for (final Long id : ids) {
            final List<String> statuses =
                    this.jdbc.queryForList("select status from sys_media where id = ? for update", String.class, id);
            if (found.containsValue(id) && (statuses.isEmpty() || !"active".equals(statuses.getFirst()))) {
                throw BizException.conflict("文件正在删除，不能新增引用");
            }
        }
        this.jdbc.update(
                "delete from sys_media_reference where source_type = ? and source_id = ? and field_key = ?",
                sourceType,
                sourceId,
                field);
        for (final Map.Entry<String, Long> entry : found.entrySet()) {
            this.jdbc.update(
                    "insert into sys_media_reference (media_id, source_type, source_id, field_key, label) values (?, ?, ?, ?, ?)",
                    entry.getValue(),
                    sourceType,
                    sourceId,
                    field,
                    label);
        }
    }

    @Override
    public List<MediaReference> findReferences(final Collection<String> urls) {
        final List<String> distinctUrls = new LinkedHashSet<>(urls).stream().toList();
        if (distinctUrls.isEmpty()) {
            return List.of();
        }
        return this.jdbc.query(
                "select media.url, reference.source_type, reference.source_id, reference.field_key, reference.label "
                        + "from sys_media_reference reference join sys_media media on media.id = reference.media_id "
                        + "where media.url in (" + JdbcMediaReferenceRepository.placeholders(distinctUrls.size()) + ")",
                (row, index) -> new MediaReference(
                        row.getString("url"),
                        row.getString("source_type"),
                        row.getString("source_id"),
                        row.getString("field_key"),
                        row.getString("label")),
                distinctUrls.toArray());
    }

    @Override
    public List<String> findUrlsInText(final String text) {
        if (text.isBlank()) {
            return List.of();
        }
        return this.jdbc.queryForList("select url from sys_media where locate(url, ?) > 0", String.class, text);
    }

    @Override
    public boolean claimDeletion(final long mediaId) {
        final List<String> statuses =
                this.jdbc.queryForList("select status from sys_media where id = ? for update", String.class, mediaId);
        if (statuses.isEmpty()) {
            throw BizException.notFound("文件不存在");
        }
        final Long count = this.jdbc.queryForObject(
                "select count(*) from sys_media_reference where media_id = ?", Long.class, mediaId);
        if (count != null && count > 0) {
            return false;
        }
        this.jdbc.update("update sys_media set status = 'deleting' where id = ?", mediaId);
        return true;
    }

    private static String placeholders(final int count) {
        return java.util.stream.IntStream.range(0, count).mapToObj(index -> "?").collect(Collectors.joining(","));
    }
}
